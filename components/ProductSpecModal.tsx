
import React, { useState } from 'react';
import { X, Book, Palette, Layout, MousePointer, MonitorPlay, FileText, Terminal, Layers, Target, Shield, Zap, Box, List, Grid } from 'lucide-react';

interface ProductSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProductSpecModal: React.FC<ProductSpecModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'prd' | 'visual' | 'prompts'>('prd');

  if (!isOpen) return null;

  const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
        activeTab === id 
          ? 'bg-slate-800 text-white shadow-lg shadow-slate-200' 
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white shadow-2xl w-full max-w-5xl h-full sm:h-[85vh] overflow-hidden flex flex-col rounded-2xl border border-slate-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
                <FileText size={20} />
             </div>
              <div>
                 <h2 className="text-base font-bold text-slate-800">保险跟单仔 - PRD</h2>
                 <p className="text-xs text-slate-400 font-mono">Ver 2.0.0 | Powered by Gemini 2.5 Flash</p>
              </div>
          </div>
          <button onClick={onClose} className="bg-slate-50 hover:bg-slate-100 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-8 py-3 sm:py-4 bg-slate-50/50 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
           <TabButton id="prd" label="产品需求" icon={Target} />
           <TabButton id="visual" label="视觉规范" icon={Palette} />
           <TabButton id="prompts" label="布局提示词" icon={Terminal} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 custom-scrollbar">
          
          {activeTab === 'prd' && (
             <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* 1. Product Background */}
                <section className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                      <Book className="text-indigo-500" size={18}/>
                      1. 产品背景与目标
                   </h3>
                   <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                      针对私域流量运营人员、销售经理及猎头等需要管理大量微信好友的用户。
                      解决手动录入联系人信息效率低、容易出错的问题。
                      通过<strong>“非侵入式 AI 视觉分析”</strong>技术，实现安全、高效的通讯录数字化管理。
                   </p>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                         <div className="text-[10px] font-bold text-indigo-800 uppercase mb-1">核心价值</div>
                         <p className="text-[10px] sm:text-xs text-indigo-600">安全防封号，100% 模拟人工视觉识别。</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                         <div className="text-[10px] font-bold text-emerald-800 uppercase mb-1">效率提升</div>
                         <p className="text-[10px] sm:text-xs text-emerald-600">录屏 1 分钟，自动整理 50+ 联系人。</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                         <div className="text-[10px] font-bold text-blue-800 uppercase mb-1">业务闭环</div>
                         <p className="text-[10px] sm:text-xs text-blue-600">从提取到标签管理、跟进记录的全流程。</p>
                      </div>
                   </div>
                </section>

                {/* 2. Functional Requirements */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Zap className="text-amber-500" size={20}/>
                      2. 核心功能需求 (Functional Requirements)
                   </h3>
                   
                   <div className="space-y-6">
                      <div>
                         <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">FR-01</span>
                            智能视觉爬虫
                         </h4>
                         <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                            <li>支持上传微信电脑版通讯录的录屏视频 (.mp4) 或截图 (.jpg/png)。</li>
                            <li>集成 <strong>Gemini 2.5 Flash</strong> 多模态模型，分析视频帧。</li>
                            <li>自动提取：备注名(Remark)、昵称(Nickname)、微信号(wxid)、标签(Tags)、描述信息。</li>
                            <li><strong>去重逻辑：</strong> 基于唯一微信号(wxid)进行去重，合并重复帧信息。</li>
                         </ul>
                      </div>
                      
                      <div className="h-px bg-slate-100" />

                      <div>
                         <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">FR-02</span>
                            联系人与标签管理
                         </h4>
                         <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                            <li>CRUD：支持手动创建、编辑、删除联系人。</li>
                            <li><strong>批量操作：</strong> 支持多选联系人，进行批量打标签、批量删除。</li>
                            <li>搜索与筛选：支持按昵称、微信号、备注、标签进行混合搜索。</li>
                         </ul>
                      </div>

                      <div className="h-px bg-slate-100" />

                      <div>
                         <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">FR-03</span>
                            跟进工作台 (CRM Lite)
                         </h4>
                         <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                            <li>快速记录：支持“一键写跟进”，记录沟通内容与日期。</li>
                            <li>状态流转：将联系人标记为“跟进中”或“已沟通/归档”。</li>
                            <li>业务字段：支持记录“成交产品”和“意向产品”。</li>
                         </ul>
                      </div>
                   </div>
                </section>

                {/* 3. Security */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Shield className="text-emerald-500" size={20}/>
                      3. 安全与非功能需求
                   </h3>
                   <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 border border-slate-100">
                      <p><strong>数据隐私：</strong> 所有联系人数据仅存储在浏览器本地 (LocalStorage)，不上传至任何第三方服务器（除 Gemini API 处理过程中的临时传输）。</p>
                      <p className="mt-2"><strong>防封号机制：</strong> 不使用 Hook 注入，不读取微信内存，完全基于“屏幕图像”识别，等同于人工肉眼查看。</p>
                   </div>
                </section>
             </div>
          )}

          {activeTab === 'visual' && (
             <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Design System Intro */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                    <h3 className="text-xl sm:text-2xl font-bold mb-2">Design System: Clean Slate</h3>
                    <p className="text-xs sm:text-slate-300 leading-relaxed">
                        基于 Tailwind CSS 的现代化企业级设计语言。强调内容的清晰度，使用大量的留白、微妙的阴影和磨砂玻璃效果 (Glassmorphism)。
                    </p>
                </div>

                {/* Colors */}
                <section>
                   <h4 className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">色彩规范 (Color Palette)</h4>
                   <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                      <div className="space-y-2">
                         <div className="h-12 sm:h-16 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-200"></div>
                         <div className="text-[10px] sm:text-xs">
                            <div className="font-bold text-slate-800">Primary Brand</div>
                            <div className="text-slate-400 font-mono">emerald-500</div>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <div className="h-12 sm:h-16 rounded-xl bg-slate-800 shadow-lg shadow-slate-200"></div>
                         <div className="text-[10px] sm:text-xs">
                            <div className="font-bold text-slate-800">Surface Dark</div>
                            <div className="text-slate-400 font-mono">slate-800</div>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <div className="h-12 sm:h-16 rounded-xl bg-slate-50 border border-slate-200"></div>
                         <div className="text-[10px] sm:text-xs">
                            <div className="font-bold text-slate-800">Background</div>
                            <div className="text-slate-400 font-mono">slate-50</div>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <div className="h-12 sm:h-16 rounded-xl bg-blue-500 shadow-lg shadow-blue-200"></div>
                         <div className="text-[10px] sm:text-xs">
                            <div className="font-bold text-slate-800">Information</div>
                            <div className="text-slate-400 font-mono">blue-500</div>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <div className="h-12 sm:h-16 rounded-xl bg-rose-500 shadow-lg shadow-rose-200"></div>
                         <div className="text-[10px] sm:text-xs">
                            <div className="font-bold text-slate-800">Error/Destructive</div>
                            <div className="text-slate-400 font-mono">rose-500</div>
                         </div>
                      </div>
                   </div>
                </section>

                {/* Components */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                   <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100">
                      <h4 className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">UI 组件特征</h4>
                      <ul className="space-y-4 text-xs sm:text-sm text-slate-600">
                          <li>
                              <strong>Card (卡片):</strong> 
                              <span className="block mt-1 font-mono text-[10px] bg-slate-100 p-1.5 rounded text-slate-500">bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all</span>
                          </li>
                          <li>
                              <strong>Input (输入框):</strong> 
                              <span className="block mt-1 font-mono text-[10px] bg-slate-100 p-1.5 rounded text-slate-500">bg-slate-50 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20</span>
                          </li>
                          <li>
                              <strong>Modal (模态框):</strong> 
                              <span className="block mt-1 font-mono text-[10px] bg-slate-100 p-1.5 rounded text-slate-500">backdrop-blur-md bg-slate-900/60 (Overlay) + bg-white rounded-3xl shadow-2xl</span>
                          </li>
                      </ul>
                   </section>

                   <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100">
                      <h4 className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">动效 (Motion)</h4>
                      <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                              <span className="text-xs sm:text-sm text-slate-700 font-medium">Hover Lift</span>
                              <div className="w-8 h-8 bg-emerald-500 rounded-lg shadow-sm transform transition-transform hover:-translate-y-1 hover:shadow-lg cursor-pointer"></div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                              <span className="text-xs sm:text-sm text-slate-700 font-medium">Click Shrink</span>
                              <div className="w-8 h-8 bg-blue-500 rounded-lg shadow-sm transform transition-transform active:scale-95 cursor-pointer"></div>
                          </div>
                      </div>
                   </section>
                </div>
             </div>
          )}

          {activeTab === 'prompts' && (
             <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                 
                 <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
                    <Terminal className="text-amber-600 shrink-0 mt-1" size={20}/>
                    <div>
                        <h4 className="font-bold text-amber-800 text-sm">如何使用这些提示词?</h4>
                        <p className="text-xs text-amber-700 mt-1">
                            以下是构建本应用界面布局的 Prompt 描述。如果您需要让 AI 生成类似的界面，请复制对应的模块描述。
                            所有布局基于 <strong>Tailwind CSS</strong>。
                        </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-8">
                    
                    {/* Layout 1: App Container */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                            <Box size={18} className="text-slate-400"/>
                            应用主容器 (App Shell)
                        </div>
                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
                            <div className="bg-slate-800 px-4 py-2 text-[10px] text-slate-400 font-mono border-b border-slate-700 flex justify-between">
                                <span>PROMPT</span>
                                <span>tsx</span>
                            </div>
                            <div className="p-4 font-mono text-xs text-green-400 leading-relaxed whitespace-pre-wrap">
{`"Create a full-screen application layout using React and Tailwind CSS.
Structure:
- Outer container: flex flex-row h-screen w-full bg-slate-50 overflow-hidden font-sans.
- Sidebar: Fixed width (w-72), h-full, border-r border-slate-100, bg-white.
- Main Content: flex-1, h-full, overflow-hidden, relative flex flex-col."`}
                            </div>
                        </div>
                    </div>

                    {/* Layout 2: Sidebar */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                            <List size={18} className="text-slate-400"/>
                            侧边栏 (Sidebar)
                        </div>
                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
                             <div className="p-4 font-mono text-xs text-blue-400 leading-relaxed whitespace-pre-wrap">
{`"Design a Sidebar component:
- Width: w-72 (288px).
- Header: h-[80px] p-6 flex items-center gap-3. Icon: Gradient rounded-xl (from-emerald-500 to-teal-600).
- Navigation: Vertical list of buttons. 
  - Style: w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all.
  - Active State: bg-emerald-50 text-emerald-700.
  - Inactive State: text-slate-600 hover:bg-slate-50.
- Footer: 'Product Spec' button at bottom, border-t border-slate-100."`}
                            </div>
                        </div>
                    </div>

                    {/* Layout 3: Glass Header */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                            <Layers size={18} className="text-slate-400"/>
                            磨砂顶栏 (Glass Header)
                        </div>
                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
                             <div className="p-4 font-mono text-xs text-purple-400 leading-relaxed whitespace-pre-wrap">
{`"Create a Sticky Header for the main content area:
- Position: sticky top-0 z-20.
- Visual Effect: backdrop-blur-xl bg-white/70 (Glassmorphism), border-b border-white/20, shadow-sm.
- Content: Flex container matching search bar and view toggles.
- Search Bar: Rounded-xl, bg-slate-100/80 focus:bg-white transition-all."`}
                            </div>
                        </div>
                    </div>

                    {/* Layout 4: Responsive Grid */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                            <Grid size={18} className="text-slate-400"/>
                            响应式卡片网格 (Card Grid)
                        </div>
                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
                             <div className="p-4 font-mono text-xs text-pink-400 leading-relaxed whitespace-pre-wrap">
{`"Implement a responsive grid for contact cards:
- Grid System: grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6.
- Card Style: bg-white rounded-2xl border border-slate-100 shadow-sm.
- Hover Effect: group hover:shadow-xl hover:-translate-y-1 transition-all duration-300.
- Selection State: border-emerald-500 ring-2 ring-emerald-500/20 if selected."`}
                            </div>
                        </div>
                    </div>

                 </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProductSpecModal;
    