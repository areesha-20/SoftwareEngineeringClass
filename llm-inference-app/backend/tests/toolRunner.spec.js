const MathTool = require('../src/tools/mathTool');
const WeatherTool = require('../src/tools/weatherTool');
const ToolRunner = require('../src/tools/toolRunner');

describe('MathTool', () => {

  describe('canHandle', () => {
    it('should handle basic arithmetic questions', () => {
      expect(MathTool.canHandle('what is 2 + 2')).toBe(true);
    });

    it('should handle calculate keyword', () => {
      expect(MathTool.canHandle('calculate 10 * 5')).toBe(true);
    });

    it('should not handle plain text questions', () => {
      expect(MathTool.canHandle('what is the capital of France')).toBe(false);
    });

    it('should not handle weather questions', () => {
      expect(MathTool.canHandle('what is the weather in New York')).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('should correctly evaluate addition', () => {
      const result = MathTool.evaluate('2 + 2');
      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
    });

    it('should correctly evaluate multiplication', () => {
      const result = MathTool.evaluate('10 * 5');
      expect(result.success).toBe(true);
      expect(result.result).toBe(50);
    });

    it('should correctly evaluate division', () => {
      const result = MathTool.evaluate('20 / 4');
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('should correctly evaluate exponentiation', () => {
      const result = MathTool.evaluate('2 ** 8');
      expect(result.success).toBe(true);
      expect(result.result).toBe(256);
    });

    it('should handle complex expressions', () => {
      const result = MathTool.evaluate('(10 + 5) * 2');
      expect(result.success).toBe(true);
      expect(result.result).toBe(30);
    });
  });

  describe('run', () => {
    it('should return a result object with message for valid math prompt', () => {
      const result = MathTool.run('what is 10 + 5');
      expect(result).not.toBeNull();
      expect(result.tool).toBe('math');
      expect(result.result).toBe(15);
      expect(result.message).toContain('15');
    });

    it('should return null for non-math prompt', () => {
      const result = MathTool.run('tell me a joke');
      expect(result).toBeNull();
    });
  });

});

describe('WeatherTool', () => {

  describe('canHandle', () => {
    it('should handle weather questions', () => {
      expect(WeatherTool.canHandle('what is the weather in New York')).toBe(true);
    });

    it('should handle temperature questions', () => {
      expect(WeatherTool.canHandle('what is the temperature in London')).toBe(true);
    });

    it('should not handle math questions', () => {
      expect(WeatherTool.canHandle('calculate 2 + 2')).toBe(false);
    });
  });

  describe('extractCity', () => {
    it('should extract city from weather question', () => {
      const city = WeatherTool.extractCity('what is the weather in New York');
      expect(city).toBe('new york');
    });

    it('should extract city from temperature question', () => {
      const city = WeatherTool.extractCity('what is the temperature in London');
      expect(city).toBe('london');
    });

    it('should return null if no city found', () => {
      const city = WeatherTool.extractCity('what is the weather today');
      expect(city).toBeNull();
    });
  });

});

describe('ToolRunner', () => {

  it('should return math result for math prompt', async () => {
    const result = await ToolRunner.run('what is 5 * 5');
    expect(result).not.toBeNull();
    expect(result.tool).toBe('math');
    expect(result.result).toBe(25);
  });

  it('should return null for general prompt', async () => {
    const result = await ToolRunner.run('tell me about the history of Rome');
    expect(result).toBeNull();
  });

  it('should return weather result for weather prompt', async () => {
    const result = await ToolRunner.run('what is the weather in London');
    expect(result).not.toBeNull();
    expect(result.tool).toBe('weather');
    expect(result.city).toContain('London');
  }, 10000);

});
