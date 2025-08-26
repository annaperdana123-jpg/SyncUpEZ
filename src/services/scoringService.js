const { readCSV } = require('../utils/csvReader');

/**
 * Contribution Scoring Service
 * Implements algorithms for measuring problem-solving, collaboration, and initiative
 */

/**
 * Problem-Solving Detection Algorithm
 * @param {string} content - Interaction content to analyze
 * @returns {number} - Problem-solving score (0-100)
 */
function calculateProblemSolvingScore(content) {
  if (!content) return 0;
  
  const lowerContent = content.toLowerCase();
  
  // Keywords for problem-solving
  const problemKeywords = [
    'problem', 'issue', 'solution', 'resolve', 'fix', 'debug', 'troubleshoot',
    'error', 'bug', 'challenge', 'difficulty', 'obstacle'
  ];
  
  // Count questions vs answers
  const questionKeywords = ['how', 'what', 'why', 'can you', 'could you', 'would you'];
  const answerKeywords = [
    'should', 'could', 'can', 'will', 'i suggest', 'i recommend', 
    'try', 'use', 'implement', 'solution', 'answer'
  ];
  
  // Count problem-solving keywords
  let problemKeywordCount = 0;
  problemKeywords.forEach(keyword => {
    problemKeywordCount += (lowerContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
  });
  
  // Count questions
  let questionCount = 0;
  questionKeywords.forEach(keyword => {
    questionCount += (lowerContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
  });
  
  // Count answers
  let answerCount = 0;
  answerKeywords.forEach(keyword => {
    answerCount += (lowerContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
  });
  
  // Calculate score: (answers_count / (questions_count + answers_count)) * 100
  // But also consider problem-solving keywords
  let score = 0;
  if (questionCount + answerCount > 0) {
    score = (answerCount / (questionCount + answerCount)) * 70; // 70% weight for Q&A ratio
  }
  
  // Add 30% weight for problem-solving keywords
  score += Math.min(problemKeywordCount * 5, 30);
  
  return Math.min(Math.round(score), 100);
}

/**
 * Collaboration Measurement Algorithm
 * @param {Array} employeeKudos - Kudos received by the employee
 * @param {Array} allEmployees - All employees in the system
 * @returns {number} - Collaboration score (0-100)
 */
function calculateCollaborationScore(employeeKudos, allEmployees) {
  if (!employeeKudos || employeeKudos.length === 0) return 0;
  
  // Get unique senders of kudos
  const uniqueSenders = [...new Set(employeeKudos.map(k => k.from_employee_id))];
  
  // Identify kudos from different teams/departments
  let crossFunctionalKudos = 0;
  
  // Get employee's team/department
  const employee = allEmployees.find(emp => emp.employee_id === employeeKudos[0].to_employee_id);
  if (employee) {
    employeeKudos.forEach(kudos => {
      const sender = allEmployees.find(emp => emp.employee_id === kudos.from_employee_id);
      if (sender && (sender.team !== employee.team || sender.department !== employee.department)) {
        crossFunctionalKudos++;
      }
    });
  }
  
  // Score calculation: (unique_senders_count * 10) + (cross_functional_kudos * 20), capped at 100
  const uniqueSendersScore = Math.min(uniqueSenders.length * 10, 70); // Max 70 points
  const crossFunctionalScore = Math.min(crossFunctionalKudos * 20, 30); // Max 30 points
  
  return Math.min(uniqueSendersScore + crossFunctionalScore, 100);
}

/**
 * Initiative Detection Algorithm
 * @param {string} content - Interaction content to analyze
 * @returns {number} - Initiative score (0-100)
 */
function calculateInitiativeScore(content) {
  if (!content) return 0;
  
  const lowerContent = content.toLowerCase();
  
  // Keywords for initiative
  const initiativeKeywords = [
    'proposal', 'idea', 'suggestion', 'initiative', 'started', 'created', 'built',
    'developed', 'launched', 'proposed', 'suggested', 'implemented', 'designed'
  ];
  
  // Count initiative keywords
  let initiativeKeywordCount = 0;
  initiativeKeywords.forEach(keyword => {
    initiativeKeywordCount += (lowerContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
  });
  
  // Identify proactive language patterns
  const proactivePhrases = [
    'i will', 'i am going to', 'i plan to', 'let me', 'i suggest', 
    'i propose', 'i recommend', 'i have started', 'i have created'
  ];
  
  let proactiveCount = 0;
  proactivePhrases.forEach(phrase => {
    proactiveCount += (lowerContent.match(new RegExp(phrase, 'g')) || []).length;
  });
  
  // Score calculation: (initiative_keywords_count * 5) + (proactive_count * 10), capped at 100
  const keywordScore = Math.min(initiativeKeywordCount * 5, 60); // Max 60 points
  const proactiveScore = Math.min(proactiveCount * 10, 40); // Max 40 points
  
  return Math.min(keywordScore + proactiveScore, 100);
}

/**
 * Calculate overall contribution score
 * @param {number} problemSolvingScore - Problem-solving score
 * @param {number} collaborationScore - Collaboration score
 * @param {number} initiativeScore - Initiative score
 * @returns {number} - Overall score (0-100)
 */
function calculateOverallScore(problemSolvingScore, collaborationScore, initiativeScore) {
  // Weighted average: 40% problem-solving, 30% collaboration, 30% initiative
  return Math.round(
    problemSolvingScore * 0.4 +
    collaborationScore * 0.3 +
    initiativeScore * 0.3
  );
}

module.exports = {
  calculateProblemSolvingScore,
  calculateCollaborationScore,
  calculateInitiativeScore,
  calculateOverallScore
};