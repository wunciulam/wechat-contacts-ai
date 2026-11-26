import React, { useMemo, useState } from 'react';
import { ArrowLeft, Bot, Check, ChevronDown, Edit2, FileText, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { Contact, SopDraft, SopSession, SopStepDraft, SopTemplate } from '../types';
import { getUsableSopTemplate } from '../constants/sopTemplates';

interface SopWorkspaceProps {
  contact: Contact;
  templates: SopTemplate[];
  draft?: SopDraft;
  onBack: () => void;
  onSaveDraft: (draft: SopDraft) => void;
  onComplete: (session: SopSession) => void;
  onUpdateTemplates: (templates: SopTemplate[]) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const createEmptyStepDraft = (): SopStepDraft => ({
  selectedOptionIds: [],
  customerQuote: '',
  judgment: '',
  nextAction: '',
  customTalkTracks: {}
});

const getContactName = (contact: Contact) => contact.remarkName || contact.nickname || '未命名客户';

const getAiOptimizedTalkTrack = (base: string, quote: string) => {
  if (!quote.trim()) return base;
  return `${base} 我会顺着你刚才说的“${quote.trim()}”先不急着比较产品，先把这笔钱的角色分清楚。`;
};

const SopWorkspace: React.FC<SopWorkspaceProps> = ({
  contact,
  templates,
  draft,
  onBack,
  onSaveDraft,
  onComplete,
  onUpdateTemplates
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(draft?.templateId || templates[0]?.id || '');
  const selectedTemplate = useMemo(() => {
    return getUsableSopTemplate(templates.find(template => template.id === selectedTemplateId) || templates[0]);
  }, [templates, selectedTemplateId]);

  const initialActiveStepId = draft?.activeStepId || selectedTemplate.steps[0]?.id || '';
  const [activeStepId, setActiveStepId] = useState(initialActiveStepId);
  const [stepDrafts, setStepDrafts] = useState<Record<string, SopStepDraft>>(draft?.steps || {});
  const [editingTalkTrackId, setEditingTalkTrackId] = useState<string | null>(null);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SopTemplate | null>(null);

  const activeStep = selectedTemplate.steps.find(step => step.id === activeStepId) || selectedTemplate.steps[0];
  const activeDraft = stepDrafts[activeStep?.id] || createEmptyStepDraft();
  const selectedOptions = activeStep?.options.filter(option => activeDraft.selectedOptionIds.includes(option.id)) || [];

  const saveDraft = (nextDrafts = stepDrafts, nextActiveStepId = activeStepId, nextTemplateId = selectedTemplate.id) => {
    onSaveDraft({
      contactId: contact.id,
      templateId: nextTemplateId,
      activeStepId: nextActiveStepId,
      steps: nextDrafts,
      updatedAt: Date.now()
    });
  };

  const updateActiveDraft = (patch: Partial<SopStepDraft>) => {
    if (!activeStep) return;
    const next = {
      ...stepDrafts,
      [activeStep.id]: {
        ...createEmptyStepDraft(),
        ...activeDraft,
        ...patch
      }
    };
    setStepDrafts(next);
    saveDraft(next);
  };

  const toggleOption = (optionId: string) => {
    const selected = new Set<string>(activeDraft.selectedOptionIds);
    if (selected.has(optionId)) selected.delete(optionId);
    else selected.add(optionId);
    updateActiveDraft({ selectedOptionIds: Array.from(selected) });
  };

  const goToStep = (stepId: string) => {
    setActiveStepId(stepId);
    saveDraft(stepDrafts, stepId);
  };

  const switchTemplate = (templateId: string) => {
    const nextTemplate = getUsableSopTemplate(templates.find(template => template.id === templateId) || templates[0]);
    setSelectedTemplateId(templateId);
    setActiveStepId(nextTemplate.steps[0]?.id || '');
    setStepDrafts({});
    setIsTemplateMenuOpen(false);
    onSaveDraft({
      contactId: contact.id,
      templateId,
      activeStepId: nextTemplate.steps[0]?.id || '',
      steps: {},
      updatedAt: Date.now()
    });
  };

  const moveStep = (direction: -1 | 1) => {
    if (!activeStep) return;
    const index = selectedTemplate.steps.findIndex(step => step.id === activeStep.id);
    const next = selectedTemplate.steps[index + direction];
    if (next) goToStep(next.id);
  };

  const handleComplete = () => {
    const session: SopSession = {
      id: generateId(),
      contactId: contact.id,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      templateSnapshot: selectedTemplate,
      steps: stepDrafts,
      createdAt: draft?.updatedAt || Date.now(),
      completedAt: Date.now()
    };
    onComplete(session);
  };

  const openTemplateManager = (template?: SopTemplate) => {
    setEditingTemplate({ ...(template || selectedTemplate), steps: [...(template || selectedTemplate).steps] });
    setIsTemplateManagerOpen(true);
    setIsTemplateMenuOpen(false);
  };

  const saveTemplateEdits = () => {
    if (!editingTemplate) return;
    const updatedTemplate = {
      ...editingTemplate,
      version: editingTemplate.version + 1,
      updatedAt: Date.now()
    };
    onUpdateTemplates(templates.map(template => template.id === updatedTemplate.id ? updatedTemplate : template));
    setEditingTemplate(null);
    setIsTemplateManagerOpen(false);
  };

  const deleteEditingTemplate = () => {
    if (!editingTemplate || templates.length <= 1) return;
    if (!window.confirm(`确定要删除模板「${editingTemplate.name}」吗？此操作无法撤销。`)) return;

    const remainingTemplates = templates.filter(template => template.id !== editingTemplate.id);
    onUpdateTemplates(remainingTemplates);

    if (selectedTemplateId === editingTemplate.id) {
      const nextTemplate = getUsableSopTemplate(remainingTemplates[0]);
      setSelectedTemplateId(nextTemplate.id);
      setActiveStepId(nextTemplate.steps[0]?.id || '');
      setStepDrafts({});
      onSaveDraft({
        contactId: contact.id,
        templateId: nextTemplate.id,
        activeStepId: nextTemplate.steps[0]?.id || '',
        steps: {},
        updatedAt: Date.now()
      });
    }

    setEditingTemplate(null);
    setIsTemplateManagerOpen(false);
  };

  const reorderEditingSteps = (steps: SopTemplate['steps']) => {
    return steps.map((step, index) => ({ ...step, order: index + 1 }));
  };

  const addTemplateStep = () => {
    if (!editingTemplate) return;
    const nextOrder = editingTemplate.steps.length + 1;
    const newStep = {
      id: `step_${generateId()}`,
      order: nextOrder,
      title: '新问题',
      purpose: '补充这个问题的目的',
      question: '输入你要问客户的问题',
      materials: [],
      options: [
        {
          id: `option_${generateId()}`,
          label: '选项',
          meaning: '这个回答意味着什么',
          responseStrategy: '你要怎么应对',
          talkTrack: '输入客户选择这个答案后，你接下来要说的话',
          followUps: []
        }
      ]
    };

    setEditingTemplate({
      ...editingTemplate,
      steps: reorderEditingSteps([...editingTemplate.steps, newStep])
    });
  };

  const deleteTemplateStep = (stepId: string) => {
    if (!editingTemplate || editingTemplate.steps.length <= 1) return;
    setEditingTemplate({
      ...editingTemplate,
      steps: reorderEditingSteps(editingTemplate.steps.filter(step => step.id !== stepId))
    });
  };

  const activeStepIndex = selectedTemplate.steps.findIndex(step => step.id === activeStep?.id);

  return (
    <div className="fixed inset-0 z-[80] bg-white flex flex-col animate-fade-in">
      <div className="h-14 shrink-0 border-b border-gray-100 bg-white px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="btn btn-ghost btn-sm">
            <ArrowLeft size={15} />
            <span>返回跟进工作台</span>
          </button>
          <div className="h-5 w-px bg-gray-100" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900 leading-tight">{getContactName(contact)}</h1>
            <p className="text-[11px] text-gray-400">SOP 展业提纲</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setIsTemplateMenuOpen(prev => !prev)} className="btn btn-secondary btn-sm max-w-[220px]">
              <FileText size={14} />
              <span className="truncate">模板：{selectedTemplate.name}</span>
              <ChevronDown size={13} />
            </button>
            {isTemplateMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[90] p-1.5">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => switchTemplate(template.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs transition-all ${template.id === selectedTemplate.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{template.name}</span>
                      {template.id === selectedTemplate.id && <Check size={13} />}
                    </div>
                    {template.description && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{template.description}</p>}
                  </button>
                ))}
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => openTemplateManager()} className="w-full text-left px-3 py-2 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50">
                  管理模板
                </button>
              </div>
            )}
          </div>
          <button onClick={() => openTemplateManager()} className="btn btn-secondary btn-sm hidden sm:inline-flex">管理模板</button>
          <span className="hidden md:inline text-[11px] text-gray-400">草稿已自动保存</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-gray-50 p-3 md:p-4">
        <div className="h-full bg-white border border-gray-100 rounded-lg overflow-hidden flex">
          <aside className="hidden lg:flex w-64 shrink-0 border-r border-gray-100 bg-gray-50/60 flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-900">7 步成交路径</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">点击目录快速定位问题</p>
            </div>
            <div className="p-2 overflow-y-auto custom-scrollbar">
              {selectedTemplate.steps.map(step => {
                const stepData = stepDrafts[step.id];
                const isDone = !!stepData && (stepData.selectedOptionIds.length > 0 || !!stepData.customerQuote);
                const isActive = step.id === activeStep?.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(step.id)}
                    className={`w-full text-left p-2.5 rounded-md transition-all mb-1 ${isActive ? 'bg-white border border-gray-200 text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center shrink-0 ${isDone ? 'bg-gray-900 border-gray-900 text-white' : isActive ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-400'}`}>
                        {isDone ? <Check size={11} /> : step.order}
                      </span>
                      <span className="text-xs font-medium truncate">{step.title}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-7 line-clamp-2">{step.purpose}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="min-w-0 overflow-y-auto custom-scrollbar p-4 md:p-5 xl:p-6">
                {activeStep && (
                  <div className="max-w-4xl mx-auto space-y-5">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <span>第 {activeStep.order} 步</span>
                        <span>/</span>
                        <span>{selectedTemplate.name}</span>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 mt-1">{activeStep.title}</h2>
                      <p className="text-sm text-gray-500 mt-1">{activeStep.purpose}</p>
                    </div>

                    <div className="border border-gray-100 rounded-lg p-4 bg-white">
                      <p className="text-xs font-medium text-gray-400 mb-2">当前问题</p>
                      <h3 className="text-lg font-semibold text-gray-900 leading-relaxed">{activeStep.question}</h3>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-700">客户回答，可多选</p>
                        <span className="text-[10px] text-gray-400">已选 {activeDraft.selectedOptionIds.length} 项</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeStep.options.map(option => {
                          const selected = activeDraft.selectedOptionIds.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              onClick={() => toggleOption(option.id)}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-all ${selected ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'}`}
                            >
                              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selected ? 'border-white bg-white text-gray-900' : 'border-gray-300'}`}>
                                {selected && <Check size={10} strokeWidth={3} />}
                              </span>
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-lg bg-gray-50/60">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">客户回答怎么判断</h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">选中回答后，先看含义，再看追问和应对话术</p>
                        </div>
                        <Sparkles size={16} className="text-gray-300" />
                      </div>
                      <div className="p-3 space-y-2">
                        {selectedOptions.length === 0 ? (
                          <div className="py-10 text-center text-sm text-gray-400">先选择客户回答，系统会显示下一句怎么接</div>
                        ) : (
                          selectedOptions.map(option => {
                            const customText = activeDraft.customTalkTracks?.[option.id];
                            const displayText = customText || option.talkTrack;
                            const isEditing = editingTalkTrackId === option.id;
                            return (
                              <div key={option.id} className="bg-white border border-gray-100 rounded-md p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[11px] font-semibold text-gray-900 bg-gray-100 rounded px-1.5 py-0.5">{option.label}</span>
                                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                                      <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-[11px] font-semibold text-gray-500">这个回答意味着</p>
                                        <p className="text-sm text-gray-800 leading-relaxed mt-1">{option.meaning || '这个回答需要结合客户原话判断，先不要急着讲产品。'}</p>
                                      </div>
                                      <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-[11px] font-semibold text-gray-500">你要怎么应对</p>
                                        <p className="text-sm text-gray-800 leading-relaxed mt-1">{option.responseStrategy || '先确认场景，再继续追问资金用途、期限和顾虑。'}</p>
                                      </div>
                                    </div>
                                    {option.followUps.length > 0 && (
                                      <div className="mt-3">
                                        <p className="text-[11px] font-semibold text-gray-500 mb-2">可继续追问</p>
                                        <div className="flex flex-wrap gap-2">
                                          {option.followUps.map(question => (
                                            <button
                                              key={question}
                                              onClick={() => updateActiveDraft({ nextAction: question })}
                                              className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                                            >
                                              {question}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <p className="text-[11px] font-semibold text-gray-500 mt-3">接下来这样说</p>
                                    {isEditing ? (
                                      <textarea
                                        value={displayText}
                                        onChange={e => updateActiveDraft({
                                          customTalkTracks: {
                                            ...(activeDraft.customTalkTracks || {}),
                                            [option.id]: e.target.value
                                          }
                                        })}
                                        className="input mt-2 min-h-[90px] resize-none"
                                      />
                                    ) : (
                                      <p className="text-sm text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">{displayText}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => setEditingTalkTrackId(isEditing ? null : option.id)}
                                      className="btn btn-secondary btn-sm"
                                    >
                                      <Edit2 size={12} />{isEditing ? '完成' : '编辑'}
                                    </button>
                                    <button
                                      onClick={() => updateActiveDraft({
                                        customTalkTracks: {
                                          ...(activeDraft.customTalkTracks || {}),
                                          [option.id]: getAiOptimizedTalkTrack(option.talkTrack, activeDraft.customerQuote)
                                        }
                                      })}
                                      className="btn btn-secondary btn-sm"
                                    >
                                      <Bot size={12} />AI 优化
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">可继续追问</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set<string>(selectedOptions.flatMap(option => option.followUps))).map(question => (
                          <button
                            key={question}
                            onClick={() => updateActiveDraft({ nextAction: question })}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                          >
                            {question}
                          </button>
                        ))}
                        {selectedOptions.length === 0 && <span className="text-xs text-gray-400">选择回答后会出现追问按钮</span>}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <aside className="border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50/50 p-4 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">客户原话 / 临场判断</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">记录是副动作，主要用于沉淀画像</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">客户原话</label>
                    <textarea
                      value={activeDraft.customerQuote}
                      onChange={e => updateActiveDraft({ customerQuote: e.target.value })}
                      placeholder="记录客户原话..."
                      className="input mt-2 min-h-[150px] resize-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">临场判断</label>
                    <textarea
                      value={activeDraft.judgment}
                      onChange={e => updateActiveDraft({ judgment: e.target.value })}
                      placeholder="例如：需要资产分工、先问期限..."
                      className="input mt-2 min-h-[90px] resize-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">下一步动作</label>
                    <input
                      value={activeDraft.nextAction}
                      onChange={e => updateActiveDraft({ nextAction: e.target.value })}
                      placeholder="例如：问期限 / 约15分钟会议"
                      className="input mt-2 bg-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOptions.map(option => (
                      <span key={option.id} className="tag">{option.label}</span>
                    ))}
                    {activeDraft.nextAction && <span className="tag tag-primary">{activeDraft.nextAction}</span>}
                  </div>
                  <button
                    onClick={() => {
                      const selectedLabels = selectedOptions.map(option => option.label).join('、');
                      updateActiveDraft({
                        judgment: activeDraft.judgment || (selectedLabels ? `客户提到${selectedLabels}，优先判断资金角色和使用期限。` : '先补充客户回答，再生成建议。')
                      });
                    }}
                    className="btn btn-secondary w-full"
                  >
                    <Sparkles size={15} />从原话生成建议
                  </button>
                  <p className="text-[10px] text-gray-400 leading-relaxed">可手动改写；AI 能力入口已预留，当前优先保留可控话术。</p>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>

      <div className="h-16 shrink-0 border-t border-gray-100 bg-white px-4 md:px-6 flex items-center justify-between">
        <button onClick={() => moveStep(-1)} disabled={activeStepIndex <= 0} className="btn btn-secondary">
          上一步
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => moveStep(1)} disabled={activeStepIndex >= selectedTemplate.steps.length - 1} className="btn btn-secondary">
            下一步
          </button>
          <button onClick={handleComplete} className="btn btn-primary">
            <Save size={15} />保存
          </button>
        </div>
      </div>

      {isTemplateManagerOpen && editingTemplate && (
        <div className="fixed inset-0 z-[100] bg-gray-900/30 flex justify-end animate-fade-in">
          <div className="w-full max-w-2xl h-full bg-white shadow-lg flex flex-col">
            <div className="h-14 border-b border-gray-100 px-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">管理模板</h3>
                <p className="text-[11px] text-gray-400">可编辑模板标题、问题、选项和话术</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={addTemplateStep} className="btn btn-secondary btn-sm">
                  <Plus size={14} />新增问题
                </button>
                <button onClick={() => setIsTemplateManagerOpen(false)} className="icon-btn">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600">模板名称</label>
                <input
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="input mt-2"
                />
              </div>
              {editingTemplate.steps.map((step, stepIndex) => (
                <div key={step.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="badge">{step.order}</span>
                    <input
                      value={step.title}
                      onChange={e => {
                        const steps = [...editingTemplate.steps];
                        steps[stepIndex] = { ...step, title: e.target.value };
                        setEditingTemplate({ ...editingTemplate, steps });
                      }}
                      className="input"
                    />
                    <button
                      onClick={() => deleteTemplateStep(step.id)}
                      disabled={editingTemplate.steps.length <= 1}
                      className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all disabled:hover:text-gray-300 disabled:hover:bg-transparent"
                      title={editingTemplate.steps.length <= 1 ? '至少保留一个问题' : '删除问题'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <input
                    value={step.purpose}
                    onChange={e => {
                      const steps = [...editingTemplate.steps];
                      steps[stepIndex] = { ...step, purpose: e.target.value };
                      setEditingTemplate({ ...editingTemplate, steps });
                    }}
                    className="input input-sm"
                    placeholder="这个问题的目的"
                  />
                  <textarea
                    value={step.question}
                    onChange={e => {
                      const steps = [...editingTemplate.steps];
                      steps[stepIndex] = { ...step, question: e.target.value };
                      setEditingTemplate({ ...editingTemplate, steps });
                    }}
                    className="input min-h-[70px] resize-none"
                  />
                  <div className="space-y-2">
                    {step.options.map((option, optionIndex) => (
                      <div key={option.id} className="rounded-md border border-gray-100 bg-gray-50/60 p-3 space-y-2">
                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
                          <input
                            value={option.label}
                            onChange={e => {
                              const steps = [...editingTemplate.steps];
                              const options = [...step.options];
                              options[optionIndex] = { ...option, label: e.target.value };
                              steps[stepIndex] = { ...step, options };
                              setEditingTemplate({ ...editingTemplate, steps });
                            }}
                            className="input input-sm"
                            placeholder="回答选项"
                          />
                          <input
                            value={option.talkTrack}
                            onChange={e => {
                              const steps = [...editingTemplate.steps];
                              const options = [...step.options];
                              options[optionIndex] = { ...option, talkTrack: e.target.value };
                              steps[stepIndex] = { ...step, options };
                              setEditingTemplate({ ...editingTemplate, steps });
                            }}
                            className="input input-sm"
                            placeholder="接下来这样说"
                          />
                        </div>
                        <textarea
                          value={option.meaning || ''}
                          onChange={e => {
                            const steps = [...editingTemplate.steps];
                            const options = [...step.options];
                            options[optionIndex] = { ...option, meaning: e.target.value };
                            steps[stepIndex] = { ...step, options };
                            setEditingTemplate({ ...editingTemplate, steps });
                          }}
                          className="input input-sm min-h-[54px] resize-none"
                          placeholder="这个回答意味着什么"
                        />
                        <textarea
                          value={option.responseStrategy || ''}
                          onChange={e => {
                            const steps = [...editingTemplate.steps];
                            const options = [...step.options];
                            options[optionIndex] = { ...option, responseStrategy: e.target.value };
                            steps[stepIndex] = { ...step, options };
                            setEditingTemplate({ ...editingTemplate, steps });
                          }}
                          className="input input-sm min-h-[54px] resize-none"
                          placeholder="你要怎么应对"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="h-16 border-t border-gray-100 px-5 flex items-center justify-end gap-2">
              <button
                onClick={deleteEditingTemplate}
                disabled={templates.length <= 1}
                className="btn btn-secondary mr-auto text-red-600 hover:text-red-700 disabled:text-gray-300"
                title={templates.length <= 1 ? '至少保留一个模板' : '删除当前模板'}
              >
                <Trash2 size={15} />删除模板
              </button>
              <button onClick={() => setIsTemplateManagerOpen(false)} className="btn btn-secondary">取消</button>
              <button onClick={saveTemplateEdits} className="btn btn-primary">保存模板</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SopWorkspace;
