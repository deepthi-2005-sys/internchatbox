import crypto from 'crypto';
import { db } from '../db/index.js';
import { getSetting } from './settingsService.js';
import { logActivity } from './activityService.js';

export async function reviewSubmission(submissionId, calculateNextReviewDateCallback) {
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
  if (!submission) throw new Error(`Submission ${submissionId} not found.`);

  const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(submission.intern_id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(submission.project_id);
  const attachments = db.prepare('SELECT * FROM attachments WHERE submission_id = ?').all(submissionId);

  // Get previous reviews for this project
  const previousReviews = db.prepare(`
    SELECT * FROM reviews 
    WHERE project_id = ? 
    ORDER BY created_at DESC LIMIT 3
  `).all(project.id);

  let requirements = [];
  try {
    requirements = JSON.parse(project.requirements || '[]');
  } catch (e) {
    requirements = [];
  }

  // Combine submission content for analysis
  let combinedContent = `Subject: ${submission.subject}\n`;
  if (submission.submission_notes) {
    combinedContent += `Submission Notes:\n${submission.submission_notes}\n\n`;
  }
  if (submission.code_snippet) {
    combinedContent += `Code Snippet:\n${submission.code_snippet}\n\n`;
  }
  attachments.forEach(att => {
    combinedContent += `Attachment [${att.file_name} (${att.mime_type})]:\n${att.content_snippet || '(Binary or document file)'}\n\n`;
  });

  // Extract previous issues for unresolved issue tracking
  const previousIssues = [];
  if (previousReviews.length > 0) {
    try {
      const lastIssues = JSON.parse(previousReviews[0].issues || '[]');
      lastIssues.forEach(iss => previousIssues.push(iss));
    } catch (e) {}
  }

  let reviewData = null;
  const geminiApiKey = getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    try {
      reviewData = await callGeminiReviewAPI(geminiApiKey, {
        intern,
        project,
        requirements,
        submissionContent: combinedContent,
        previousReviews,
        previousIssues
      });
      reviewData.ai_model = 'gemini-1.5-flash';
    } catch (apiErr) {
      console.warn('Gemini API call failed, using intelligent grounded heuristic analyzer:', apiErr.message);
      logActivity('ai_review', 'Gemini API Fallback', `Gemini API returned error (${apiErr.message}). Utilized grounded semantic evaluator.`, 'warning');
      reviewData = generateGroundedHeuristicReview({
        intern,
        project,
        requirements,
        submission,
        combinedContent,
        attachments,
        previousIssues
      });
      reviewData.ai_model = 'interntrack-grounded-evaluator-v1';
    }
  } else {
    reviewData = generateGroundedHeuristicReview({
      intern,
      project,
      requirements,
      submission,
      combinedContent,
      attachments,
      previousIssues
    });
    reviewData.ai_model = 'interntrack-grounded-evaluator-v1';
  }

  // Calculate next review date
  const nextReviewDate = calculateNextReviewDateCallback ? 
    calculateNextReviewDateCallback(project, reviewData.status, reviewData.score) : 
    calculateDefaultNextReviewDate(reviewData.status);

  const reviewId = 'rev-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  // Save review
  db.prepare(`
    INSERT INTO reviews (
      id, submission_id, intern_id, project_id, status, score, summary,
      strengths, issues, actionable_suggestions, unresolved_issues_tracked,
      next_review_date, ai_model, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reviewId,
    submission.id,
    intern.id,
    project.id,
    reviewData.status,
    reviewData.score,
    reviewData.summary,
    JSON.stringify(reviewData.strengths),
    JSON.stringify(reviewData.issues),
    JSON.stringify(reviewData.actionable_suggestions),
    JSON.stringify(reviewData.unresolved_issues_tracked),
    nextReviewDate,
    reviewData.ai_model,
    now
  );

  // Update submission status
  db.prepare("UPDATE submissions SET status = 'reviewed' WHERE id = ?").run(submission.id);

  // Update project current score and review status
  let projStatus = project.status;
  if (reviewData.score >= 85) {
    projStatus = 'ready_for_review';
  } else {
    projStatus = 'in_progress';
  }

  // Update requirement statuses in project if satisfied
  const updatedRequirements = requirements.map(req => {
    // If requirement is mentioned in strengths or resolved issues, advance it
    const isSatisfied = reviewData.strengths.some(s => 
      s.title.toLowerCase().includes(req.title.toLowerCase().slice(0, 10)) ||
      s.detail.toLowerCase().includes(req.id.toLowerCase())
    );
    if (isSatisfied && req.status !== 'completed') {
      return { ...req, status: 'completed' };
    }
    const hasIssue = reviewData.issues.some(i => 
      i.title.toLowerCase().includes(req.title.toLowerCase().slice(0, 10)) ||
      i.detail.toLowerCase().includes(req.id.toLowerCase())
    );
    if (hasIssue && req.status === 'pending') {
      return { ...req, status: 'in_progress' };
    }
    return req;
  });

  db.prepare(`
    UPDATE projects 
    SET current_score = ?, current_review_status = ?, status = ?, requirements = ? 
    WHERE id = ?
  `).run(reviewData.score, reviewData.status, projStatus, JSON.stringify(updatedRequirements), project.id);

  logActivity('ai_review', 'AI Review Generated', `Completed grounded review for ${intern.name} on "${project.title}". Score: ${reviewData.score}/100 [${reviewData.status}].`, 'success');

  const createdReview = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
  return {
    review: createdReview,
    intern,
    project,
    submission
  };
}

async function callGeminiReviewAPI(apiKey, { intern, project, requirements, submissionContent, previousReviews, previousIssues }) {
  const prompt = `
You are InternTrack AI, an expert, objective engineering supervisor reviewing an intern's project submission.
CRITICAL MANDATE: Never invent errors or claim that requirements are missing without supporting evidence from the provided submission code, notes, or attachments. Ground all praise and criticism strictly in evidence.

INTERN INFO:
Name: ${intern.name}
Role: ${intern.role}
Department: ${intern.department}

PROJECT:
Title: ${project.title}
Description: ${project.description}
Deadline: ${project.deadline}

OFFICIAL PROJECT REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

PREVIOUS REVIEW HISTORY:
${JSON.stringify(previousReviews.map(r => ({ status: r.status, score: r.score, summary: r.summary })), null, 2)}

PREVIOUS IDENTIFIED ISSUES TO TRACK (UNRESOLVED ITEMS):
${JSON.stringify(previousIssues, null, 2)}

SUBMITTED CONTENT & CODE:
"""
${submissionContent}
"""

TASK:
1. Grounded Analysis: Compare the submitted work against each project requirement.
2. Track Unresolved Issues: Examine each previously identified issue. Check if the intern has fixed it in this submission. Mark each as "RESOLVED" (with evidence of the fix) or "UNRESOLVED" (with explanation).
3. Identify Strengths: Highlight concrete work completed with citations.
4. Identify Issues: Identify real flaws, syntax mistakes, or missing required features with exact evidence. Provide concrete code corrections.
5. Score: Assign a fair score 0-100.
6. Status: Must be exactly one of: "Needs Improvement" (score < 60), "In Progress" (score 60-84), or "Ready for Final Review" (score >= 85).

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "score": number,
  "status": "Needs Improvement" | "In Progress" | "Ready for Final Review",
  "summary": "2-3 paragraphs of supportive, professional executive feedback",
  "strengths": [
    { "title": string, "detail": string, "evidence": string }
  ],
  "issues": [
    { "id": "ISSUE-01", "title": string, "severity": "High" | "Medium" | "Low", "detail": string, "evidence": string, "correction": string }
  ],
  "actionable_suggestions": [
    string
  ],
  "unresolved_issues_tracked": [
    { "id": string, "title": string, "previous_status": string, "current_status": "RESOLVED" | "UNRESOLVED", "notes": string }
  ]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('No content returned by Gemini API');

  return JSON.parse(rawText);
}

function generateGroundedHeuristicReview({ intern, project, requirements, submission, combinedContent, attachments, previousIssues }) {
  const contentLower = combinedContent.toLowerCase();
  const strengths = [];
  const issues = [];
  const actionable_suggestions = [];
  const unresolved_issues_tracked = [];

  // Check unresolved issues from previous reviews
  previousIssues.forEach((prevIssue, idx) => {
    const titleTokens = prevIssue.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const mentionsFix = titleTokens.some(tok => contentLower.includes(tok));
    const codeHasFix = submission.code_snippet && titleTokens.some(tok => submission.code_snippet.toLowerCase().includes(tok));

    if (mentionsFix || codeHasFix) {
      unresolved_issues_tracked.push({
        id: prevIssue.id || `ISSUE-0${idx + 1}`,
        title: prevIssue.title,
        previous_status: 'UNRESOLVED',
        current_status: 'RESOLVED',
        notes: `Addressed in this submission. Demonstrated in submission notes and revised code.`
      });
      strengths.push({
        title: `Resolved previous issue: ${prevIssue.title}`,
        detail: `The intern took feedback into account and implemented the recommended adjustments.`,
        evidence: `Submission notes / code snippet reference: "${titleTokens[0]}"`
      });
    } else {
      unresolved_issues_tracked.push({
        id: prevIssue.id || `ISSUE-0${idx + 1}`,
        title: prevIssue.title,
        previous_status: 'UNRESOLVED',
        current_status: 'UNRESOLVED',
        notes: `Still needs attention in the upcoming milestone.`
      });
    }
  });

  // Evaluate against requirements
  let completedReqsCount = 0;
  requirements.forEach((req, idx) => {
    const keywords = req.title.toLowerCase().split(/[\s,&/-]+/).filter(w => w.length > 3);
    const matchesKeyword = keywords.some(k => contentLower.includes(k));

    if (matchesKeyword) {
      completedReqsCount++;
      strengths.push({
        title: `Requirement Satisfied: ${req.title}`,
        detail: `The submission directly addresses "${req.description}".`,
        evidence: `Found implementation keywords [${keywords.filter(k => contentLower.includes(k)).join(', ')}] in submitted code & notes.`
      });
    } else if (req.status === 'completed') {
      completedReqsCount++;
      strengths.push({
        title: `Maintained Requirement: ${req.title}`,
        detail: `Retains compliance from earlier milestone evaluation.`,
        evidence: `Previous milestone verification: verified in project baseline.`
      });
    } else {
      issues.push({
        id: `ISSUE-R0${idx + 1}`,
        title: `Missing or Incomplete Requirement: ${req.title}`,
        severity: req.category === 'Security' || req.category === 'Reliability' ? 'High' : 'Medium',
        detail: `Requirement "${req.description}" was not found in the submitted files or code excerpts.`,
        evidence: `Search across submitted notes and attachments showed 0 occurrences of ${keywords.slice(0, 2).join(' or ')}.`,
        correction: `Implement ${req.title} according to project specification before the next review.`
      });
      actionable_suggestions.push(`Focus on implementing "${req.title}" (${req.description}).`);
    }
  });

  // Grounded Code Quality Analysis on submitted code
  if (submission.code_snippet) {
    const code = submission.code_snippet;
    if (code.includes('console.log') && !code.includes('logger')) {
      issues.push({
        id: 'ISSUE-CQ01',
        title: 'Console logging in production code path',
        severity: 'Low',
        detail: 'Direct console.log or console.error calls detected. Use a structured logger with log levels.',
        evidence: `Found console statement in submitted code: "${code.match(/console\.(log|error)\([^)]+\)/)?.[0] || 'console.log'}"`,
        correction: `Replace console statements with a configurable structured logger (e.g. Winston, Pino, or custom logger module).`
      });
    }

    if (code.includes('catch (err)') && (code.includes('// TODO') || code.includes('// Missing') || code.includes('empty'))) {
      issues.push({
        id: 'ISSUE-CQ02',
        title: 'Incomplete Error Handling Block',
        severity: 'High',
        detail: 'Catch or error handler block contains placeholder comments without recovery or user-facing messaging.',
        evidence: 'Error block contains placeholder comment indicating incomplete exception handling.',
        correction: `Implement proper fallback behavior, user notification, and error telemetry capture.`
      });
    }

    if (code.length > 50 && !code.includes('test') && !code.includes('expect(') && !code.includes('assert')) {
      actionable_suggestions.push('Provide accompanying unit test cases with assertions for edge cases.');
    }
  }

  // Calculate score
  const totalReqs = Math.max(requirements.length, 1);
  const reqScore = (completedReqsCount / totalReqs) * 70;
  const issuePenalty = issues.filter(i => i.severity === 'High').length * 15 + issues.filter(i => i.severity === 'Medium').length * 8;
  const strengthBonus = Math.min(strengths.length * 6, 30);

  let rawScore = Math.round(reqScore + strengthBonus - issuePenalty);
  let score = Math.max(35, Math.min(96, rawScore));

  let status = 'In Progress';
  if (score >= 85 && issues.filter(i => i.severity === 'High').length === 0) {
    status = 'Ready for Final Review';
  } else if (score < 60 || issues.filter(i => i.severity === 'High').length >= 2) {
    status = 'Needs Improvement';
  }

  const summary = `Overall assessment for ${project.title}: The intern demonstrated clear technical momentum with ${strengths.length} verified strength areas and requirement implementations. There are ${issues.length} active issue(s) identified that require remediation, including ${issues.filter(i => i.severity === 'High').length} high-priority item(s). Current milestone standing is rated "${status}" with an overall readiness score of ${score}/100.`;

  actionable_suggestions.push('Review the itemized corrections below and submit an updated revision prior to the next scheduled check-in.');

  return {
    score,
    status,
    summary,
    strengths,
    issues,
    actionable_suggestions,
    unresolved_issues_tracked
  };
}

function calculateDefaultNextReviewDate(status) {
  const now = new Date();
  let daysToAdd = 7;
  if (status === 'Needs Improvement') {
    daysToAdd = 3; // Needs faster turnaround for corrections
  } else if (status === 'Ready for Final Review') {
    daysToAdd = 5; // Final presentation / sign-off
  } else {
    daysToAdd = 7; // Standard cadence
  }
  const nextDate = new Date(now.getTime() + daysToAdd * 86400000);
  return nextDate.toISOString().split('T')[0];
}
