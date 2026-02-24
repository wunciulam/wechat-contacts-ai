
// Fix: Use gemini-3-flash-preview for Basic/Complex media analysis as per task type guidelines.
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, ExtractedTableData } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const getAI = () => {
  if (!apiKey) {
    throw new Error("未配置 Gemini API Key，请在 .env.local 中设置 VITE_GEMINI_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

const CONTACT_SYSTEM_INSTRUCTION = `
你是一个专门用于分析微信（WeChat）桌面版通讯录录屏的 AI 助手。

**视频场景描述**：
用户正在操作微信电脑版。视频中，用户在左侧通讯录列表中**逐个点击**联系人。每次点击后，右侧面板会刷新并显示该联系人的详细资料（头像、大字名称、微信号、地区、备注、标签等）。

**核心任务**：
请仔细观察视频流，检测“右侧详情面板”的**内容变化**。每当一个新的联系人详情页面稳定显示（通常会停留 0.5 秒以上）时，提取该页面的所有文本信息。

**字段提取规则**：
1. **remarkName** (备注名): 
   - 详情页最顶部、字体最大、最显眼的文本。
   - 注意：如果用户没有设置备注，这里显示的就是昵称。
2. **nickname** (昵称): 
   - 查找显示在“备注名”下方的小字，通常格式为“昵称: xxx”。
   - 如果找不到“昵称:”字样，且顶部大字确实是昵称，则此字段可存相同值或留空。
3. **wxid** (微信号): 
   - 查找“微信号”或“WeChat ID”旁边的英文/数字组合。这是唯一标识符。
4. **tags** (标签): 
   - 查找“标签”字段。提取所有显示的标签文本。返回数组。
5. **remarkInfo** (备注/描述): 
   - 查找“备注”字段下的长文本（电话号码、描述信息等）。**不要**包含标签内容。

**处理逻辑**：
- **去重**: 视频中同一个联系人可能会显示多帧。请务必根据【微信号 (wxid)】进行去重，每个微信号只保留一条最完整的数据。
- **忽略过渡帧**: 忽略点击瞬间的模糊或加载画面，只读取清晰的详情页。
- **忽略非联系人**: 如果点击的是群聊或公众号（没有微信号字段），请忽略。

**输出 JSON 格式**：
必须严格返回以下 JSON 结构：
{
  "contacts": [
    {
      "nickname": "String",
      "remarkName": "String",
      "wxid": "String",
      "remarkInfo": "String",
      "tags": ["Tag1", "Tag2"]
    }
  ]
}
`;

const TABLE_SYSTEM_INSTRUCTION = `
你是一个专业的数据录入专员。你的任务是分析上传的 Excel 表格截图，识别表格类型并提取数据。

**识别规则**：
图片中包含两种可能的表格类型，请根据表头（Header）自动判断：

**类型 1：客户信息表 (Customer Table)**
- 特征表头：序号, 客户姓名, 证件号, 出生日期, 手机号, 地址, 银行账号...
- 提取字段：
  - customerName (客户姓名)
  - idCard (证件号)
  - phoneNumber (手机号)
  - address (地址)
  - bankAccount (银行账号)

**类型 2：保单信息表 (Policy Table)**
- 特征表头：产品名称, 生效日期, 投保人姓名, 被保人, 保单状态, 保费, 保险公司, 保单号...
- 提取字段：
  - productName (产品名称)
  - effectiveDate (生效日期, 格式 YYYY-MM-DD)
  - applicantName (投保人姓名)
  - insuredName (被保人)
  - status (保单状态)
  - premium (保费)
  - company (保险公司)
  - policyNumber (保单号)
  - phoneNumber (手机号 - 可能在表格靠后的列)

**输出要求**：
返回 JSON 格式。
- "type": 必须是 "customer" 或 "policy"。
- "items": 包含提取出的行数据数组。

请忽略表头行，只提取数据行。如果某一列为空，返回空字符串。
`;

export const extractContactsFromMedia = async (base64Data: string, mimeType: string): Promise<ExtractedData[]> => {
  if (!apiKey) {
    throw new Error("未配置 Gemini API Key，无法使用 AI 识别功能。请在 .env.local 中设置 VITE_GEMINI_API_KEY");
  }
  
  const ai = getAI();
  try {
    const isVideo = mimeType.startsWith('video/');
    // Fix: Use 'gemini-3-flash-preview' for efficient and capable media analysis as per current instructions.
    const model = 'gemini-3-flash-preview'; 

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: isVideo 
              ? "这是一个微信通讯录的操作视频。请按照 System Instruction 的要求，提取每一个被点击查看详情的联系人信息。请确保只提取详情页的信息，忽略列表页。" 
              : "分析这张微信联系人详情截图，提取信息。",
          },
        ],
      },
      config: {
        systemInstruction: CONTACT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contacts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nickname: { type: Type.STRING },
                  remarkName: { type: Type.STRING },
                  wxid: { type: Type.STRING },
                  remarkInfo: { type: Type.STRING },
                  tags: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                }
              }
            }
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI 未返回数据");
    }

    const data = JSON.parse(text);
    return data.contacts || [];
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    
    // Check for common size/network errors
    const errorMessage = error.message || JSON.stringify(error);
    if (errorMessage.includes("413") || errorMessage.includes("Rpc failed") || errorMessage.includes("xhr error")) {
       throw new Error("视频文件过大，网络传输超时。请尝试截取更短的视频（建议小于 10MB）。");
    }
    
    throw error;
  }
};

export const extractTableFromMedia = async (base64Data: string, mimeType: string): Promise<ExtractedTableData> => {
  if (!apiKey) {
    throw new Error("未配置 Gemini API Key，无法使用 AI 识别功能。请在 .env.local 中设置 VITE_GEMINI_API_KEY");
  }
  
  const ai = getAI();
  try {
    // Fix: Use 'gemini-3-flash-preview' for efficient and capable media analysis as per current instructions.
    const model = 'gemini-3-flash-preview'; 

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "分析这张表格截图，判断是客户信息表还是保单信息表，并提取所有行的数据。",
          },
        ],
      },
      config: {
        systemInstruction: TABLE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["customer", "policy"] },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  // Common / Mixed fields, the AI will fill only relevant ones based on type
                  customerName: { type: Type.STRING },
                  idCard: { type: Type.STRING },
                  phoneNumber: { type: Type.STRING },
                  address: { type: Type.STRING },
                  bankAccount: { type: Type.STRING },
                  
                  productName: { type: Type.STRING },
                  effectiveDate: { type: Type.STRING },
                  applicantName: { type: Type.STRING },
                  insuredName: { type: Type.STRING },
                  status: { type: Type.STRING },
                  premium: { type: Type.STRING },
                  company: { type: Type.STRING },
                  policyNumber: { type: Type.STRING },
                }
              }
            }
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI 未返回数据");
    
    return JSON.parse(text) as ExtractedTableData;

  } catch (error: any) {
    console.error("Gemini Table Extraction Error:", error);
    throw new Error("表格解析失败，请确保截图清晰包含表头和数据。");
  }
};
