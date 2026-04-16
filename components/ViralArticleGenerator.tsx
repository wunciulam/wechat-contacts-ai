import React, { useState } from 'react';
import { ViralArticleGenerator } from '../services/viralArticleGenerator';
import { SensitiveWordDetector } from '../services/sensitiveWordDetector';

interface ArticleConfig {
  topic: string;
  tone: '专业' | '幽默' | '温暖' | '激励' | '分享';
  targetAudience: string;
  keywords: string;
  wordCount: number;
}

interface GeneratedArticle {
  title: string;
  content: string;
  tags: string[];
  hook: string;
  callToAction: string;
}

const ViralArticleGeneratorUI: React.FC = () => {
  const [config, setConfig] = useState<ArticleConfig>({
    topic: '',
    tone: '分享',
    targetAudience: '25-35岁女性',
    keywords: '',
    wordCount: 500,
  });

  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [sensitiveResult, setSensitiveResult] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const generator = new ViralArticleGenerator(apiKey);
  const sensitiveDetector = new SensitiveWordDetector();

  // 生成文章
  const handleGenerate = async () => {
    if (!config.topic) {
      alert('请输入主题');
      return;
    }

    setIsGenerating(true);
    setGenerationStep('正在分析热点话题...');
    setSensitiveResult(null);

    try {
      // 生成标题选项
      setGenerationStep('正在生成爆款标题...');
      const generatedTitles = await generator.generateViralTitles({
        ...config,
        keywords: config.keywords.split(',').map(k => k.trim()).filter(k => k),
        platform: 'xiaohongshu'
      });
      setTitles(generatedTitles);

      // 生成完整文章
      setGenerationStep('正在撰写爆款内容...');
      const article = await generator.generateArticle({
        ...config,
        keywords: config.keywords.split(',').map(k => k.trim()).filter(k => k),
        platform: 'xiaohongshu'
      });

      setGeneratedArticle(article);
      setSelectedTitle(article.title);
      setGenerationStep('生成完成！');
    } catch (error) {
      console.error('生成失败:', error);
      setGenerationStep('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 重新生成标题
  const handleRegenerateTitles = async () => {
    const newTitles = await generator.generateViralTitles({
      ...config,
      keywords: config.keywords.split(',').map(k => k.trim()).filter(k => k),
      platform: 'xiaohongshu'
    });
    setTitles(newTitles);
  };

  // 检查敏感词
  const handleCheckSensitiveWords = () => {
    if (!generatedArticle) return;

    const titleResult = sensitiveDetector.detect(selectedTitle);
    const contentResult = sensitiveDetector.detect(generatedArticle.content);

    const combinedResult = {
      hasSensitiveWords: titleResult.hasSensitiveWords || contentResult.hasSensitiveWords,
      found: [...new Set([...titleResult.found, ...contentResult.found])],
      suggestions: { ...titleResult.suggestions, ...contentResult.suggestions }
    };

    setSensitiveResult(combinedResult);
  };

  // 自动替换敏感词
  const handleAutoReplace = () => {
    if (!generatedArticle) return;

    const optimizedContent = sensitiveDetector.autoReplace(generatedArticle.content);
    const optimizedTitle = sensitiveDetector.autoReplace(selectedTitle);

    setGeneratedArticle({
      ...generatedArticle,
      content: optimizedContent
    });
    setSelectedTitle(optimizedTitle);
    setSensitiveResult(null);
  };

  // 复制内容
  const handleCopyContent = () => {
    if (!generatedArticle) return;

    const fullContent = `
${selectedTitle}

${generatedArticle.content}

${generatedArticle.tags.join(' ')}
    `.trim();

    navigator.clipboard.writeText(fullContent);
    alert('✅ 已复制到剪贴板！');
  };

  // 计算爆款指数
  const calculateViralScore = () => {
    if (!generatedArticle) return { title: 0, content: 0, interaction: 0 };

    const content = generatedArticle.content;
    
    // 标题吸引力评分
    let titleScore = 70;
    if (/\d/.test(selectedTitle)) titleScore += 10; // 包含数字
    if (/[！!]/.test(selectedTitle)) titleScore += 5; // 包含感叹号
    if (selectedTitle.length <= 20) titleScore += 5; // 长度合适
    if (selectedTitle.length > 80) titleScore = 80;

    // 内容价值评分
    let contentScore = 75;
    if (content.includes('👉') || content.includes('✅')) contentScore += 5; // 有符号
    if (content.split('\n').length > 10) contentScore += 5; // 内容丰富
    if (/\d/.test(content)) contentScore += 5; // 包含数字
    if (contentScore > 95) contentScore = 95;

    // 互动潜力评分
    let interactionScore = 70;
    if (content.includes('评论')) interactionScore += 10;
    if (content.includes('收藏') || content.includes('点赞')) interactionScore += 10;
    if (content.includes('?') || content.includes('？')) interactionScore += 5;
    if (interactionScore > 90) interactionScore = 90;

    return { title: titleScore, content: contentScore, interaction: interactionScore };
  };

  const scores = calculateViralScore();

  return (
    <div className="viral-generator-container">
      <div className="generator-header">
        <h1>🔥 爆款文章生成器</h1>
        <button 
          className="btn-settings"
          onClick={() => setShowSettings(!showSettings)}
        >
          ⚙️ 设置
        </button>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="settings-panel">
          <div className="form-group">
            <label>AI API Key（可选，用于AI生成）</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 OpenAI API Key"
            />
            <small>不填写将使用模板生成</small>
          </div>
        </div>
      )}

      {/* 配置表单 */}
      <div className="config-form">
        <div className="form-group">
          <label>📝 主题 *</label>
          <input
            type="text"
            value={config.topic}
            onChange={(e) => setConfig({...config, topic: e.target.value})}
            placeholder="例如：护肤技巧、理财方法、职场经验"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>🎭 语调风格</label>
            <select
              value={config.tone}
              onChange={(e) => setConfig({...config, tone: e.target.value as any})}
            >
              <option value="专业">专业严谨</option>
              <option value="幽默">幽默风趣</option>
              <option value="温暖">温暖治愈</option>
              <option value="激励">激励人心</option>
              <option value="分享">真实分享</option>
            </select>
          </div>

          <div className="form-group">
            <label>👥 目标受众</label>
            <input
              type="text"
              value={config.targetAudience}
              onChange={(e) => setConfig({...config, targetAudience: e.target.value})}
              placeholder="例如：大学生、宝妈、职场新人"
            />
          </div>
        </div>

        <div className="form-group">
          <label>🏷️ 关键词（逗号分隔）</label>
          <input
            type="text"
            value={config.keywords}
            onChange={(e) => setConfig({...config, keywords: e.target.value})}
            placeholder="例如：护肤,美白,抗老,精华"
          />
        </div>

        <div className="form-group">
          <label>📊 字数：{config.wordCount}字</label>
          <input
            type="range"
            min="300"
            max="1000"
            step="50"
            value={config.wordCount}
            onChange={(e) => setConfig({...config, wordCount: parseInt(e.target.value)})}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !config.topic}
          className="btn-generate"
        >
          {isGenerating ? '生成中...' : '✨ 一键生成爆款文章'}
        </button>

        {generationStep && (
          <div className="generation-status">
            <span className="loading-spinner"></span>
            {generationStep}
          </div>
        )}
      </div>

      {/* 生成结果 */}
      {generatedArticle && (
        <div className="generation-result">
          <h2>✨ 生成结果</h2>

          {/* 标题选择 */}
          <div className="title-section">
            <h3>📝 标题选项（点击选择）</h3>
            <div className="title-options">
              {titles.map((title, idx) => (
                <div
                  key={idx}
                  className={`title-option ${selectedTitle === title ? 'selected' : ''}`}
                  onClick={() => setSelectedTitle(title)}
                >
                  {title}
                </div>
              ))}
            </div>
            <button onClick={handleRegenerateTitles} className="btn-secondary">
              🔄 换一批标题
            </button>
          </div>

          {/* 文章内容 */}
          <div className="content-section">
            <h3>📄 文章内容</h3>
            <div className="article-preview">
              <h4>{selectedTitle}</h4>
              <div className="article-content">
                {generatedArticle.content.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
              <div className="article-tags">
                {generatedArticle.tags.map((tag, idx) => (
                  <span key={idx} className="tag">{tag}</span>
                ))}
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={handleCheckSensitiveWords} className="btn-check">
                🛡️ 敏感词检测
              </button>
              <button onClick={handleAutoReplace} className="btn-optimize">
                ✨ 优化敏感词
              </button>
              <button onClick={handleCopyContent} className="btn-copy">
                📋 复制全部内容
              </button>
            </div>
          </div>

          {/* 敏感词检测结果 */}
          {sensitiveResult?.hasSensitiveWords && (
            <div className="sensitive-warning">
              <h3>⚠️ 发现敏感词</h3>
              <p>检测到以下敏感词：{sensitiveResult.found.join(', ')}</p>
              {Object.keys(sensitiveResult.suggestions).length > 0 && (
                <div className="suggestions">
                  <p>💡 建议替换：</p>
                  {Object.entries(sensitiveResult.suggestions).map(([word, suggestion]) => (
                    <span key={word} className="suggestion-item">
                      "{word}" → "{suggestion}"
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 爆款评分 */}
          <div className="viral-score">
            <h3>📊 爆款指数评估</h3>
            <div className="score-metrics">
              <div className="metric">
                <span>标题吸引力</span>
                <div className="score-bar">
                  <div className="score-fill" style={{width: `${scores.title}%`}}></div>
                </div>
                <span>{scores.title}%</span>
              </div>
              <div className="metric">
                <span>内容价值</span>
                <div className="score-bar">
                  <div className="score-fill" style={{width: `${scores.content}%`}}></div>
                </div>
                <span>{scores.content}%</span>
              </div>
              <div className="metric">
                <span>互动潜力</span>
                <div className="score-bar">
                  <div className="score-fill" style={{width: `${scores.interaction}%`}}></div>
                </div>
                <span>{scores.interaction}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViralArticleGeneratorUI;
