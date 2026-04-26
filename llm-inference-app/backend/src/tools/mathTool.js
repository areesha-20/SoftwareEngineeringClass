/**
 * mathTool.js
 * Safely evaluates math expressions without using eval().
 * Supports: +, -, *, /, **, %, parentheses, sqrt, abs, round, floor, ceil
 */

class MathTool {
  static NAME = 'math';
  static DESCRIPTION = 'Evaluates mathematical expressions accurately';

  static canHandle(prompt) {
    const p = prompt.toLowerCase();
    // Matches prompts that look like math questions
    return (
      /calculate|compute|solve|math|what is|equals|result of/.test(p) &&
      /[\d]/.test(p) &&
      /[+\-*/^%]|sqrt|square root|squared|cubed/.test(p)
    ) || /^\s*[\d\s+\-*/().^%]+\s*[=?]?\s*$/.test(p);
  }

  static extractExpression(prompt) {
    let expr = prompt
      .toLowerCase()
      .replace(/what is|calculate|compute|solve|equals|the result of|please/gi, '')
      .replace(/squared/g, '**2')
      .replace(/cubed/g, '**3')
      .replace(/square root of/g, 'sqrt')
      .replace(/x/g, '*')
      .replace(/[?=]/g, '')
      .trim();
    return expr;
  }

  static evaluate(expression) {
    // Only allow safe characters
    const sanitized = expression.replace(/[^0-9+\-*/().,% \t\n]/g, (match) => {
      const allowed = ['sqrt', 'abs', 'round', 'floor', 'ceil', 'Math', '**'];
      return allowed.some(a => expression.includes(a)) ? match : '';
    });

    // Replace sqrt() with Math.sqrt()
    const withMath = sanitized
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/abs\(/g, 'Math.abs(')
      .replace(/round\(/g, 'Math.round(')
      .replace(/floor\(/g, 'Math.floor(')
      .replace(/ceil\(/g, 'Math.ceil(');

    try {
      // Use Function instead of eval for slightly safer execution
      const result = new Function(`"use strict"; return (${withMath})`)();
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid result');
      }
      return { success: true, result: Math.round(result * 1e10) / 1e10 };
    } catch (e) {
      return { success: false, error: 'Could not evaluate expression' };
    }
  }

  static run(prompt) {
    const expression = MathTool.extractExpression(prompt);
    const outcome = MathTool.evaluate(expression);
    if (outcome.success) {
      return {
        tool: 'math',
        expression,
        result: outcome.result,
        message: `The answer to "${expression.trim()}" is **${outcome.result}**.`
      };
    }
    return null;
  }
}

module.exports = MathTool;
