/**
 * toolRunner.js
 * Detects which tool (if any) should handle a prompt and runs it.
 */

const MathTool = require('./mathTool');
const WeatherTool = require('./weatherTool');

class ToolRunner {
  static async run(prompt) {
    if (MathTool.canHandle(prompt)) {
      const result = MathTool.run(prompt);
      if (result) return result;
    }

    if (WeatherTool.canHandle(prompt)) {
      const result = await WeatherTool.run(prompt);
      if (result) return result;
    }

    return null;
  }
}

module.exports = ToolRunner;
