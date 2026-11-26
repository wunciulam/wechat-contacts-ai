import { SopTemplate } from '../types';

const now = Date.now();

export const DEFAULT_SOP_TEMPLATES: SopTemplate[] = [
  {
    id: 'tpl_hk_savings_screening',
    name: '香港储蓄险初筛',
    description: '按关系、动机、资金、期限、需求、决策和动作推进的展业提纲',
    version: 1,
    createdAt: now,
    updatedAt: now,
    steps: [
      {
        id: 'relationship',
        order: 1,
        title: '关系定位',
        purpose: '判断该用熟人、转介绍、朋友圈咨询，还是冷线索激活切入。',
        question: '你是怎么想到来了解香港保险的？是看到我朋友圈，朋友介绍，还是最近自己刚好有资金要安排？',
        materials: ['介绍人关系', '资产配置图', '低压力重启话术'],
        options: [
          {
            id: 'friend_referral',
            label: '朋友介绍',
            talkTrack: 'XX介绍你来，我会认真帮你看，但我不会一上来就说你适合买。你先跟我说，你是想知道香港保险到底好在哪，还是自己有一笔钱要安排？',
            followUps: ['介绍人怎么跟你提到的？', '你是想先了解逻辑，还是已经有钱要安排？']
          },
          {
            id: 'moments',
            label: '看朋友圈',
            talkTrack: '那你应该不是单纯想听产品，而是对美元资产、境外配置或者长期储蓄有点兴趣。你现在最想了解哪一块？',
            followUps: ['是哪条内容让你有兴趣？', '你更关心美元资产还是长期储蓄？']
          },
          {
            id: 'funds_ready',
            label: '最近有资金',
            talkTrack: '那我们先不讲产品，先讲钱。你这笔钱原本准备怎么放？',
            followUps: ['这笔钱大概多少？', '原来准备放哪里？']
          },
          {
            id: 'casual',
            label: '随便了解',
            talkTrack: '可以，那我先给你讲适合什么人。你听完觉得像你，我们再深入；不像你，就当补一个信息。',
            followUps: ['你主要想补哪个信息？', '你身边有人买过吗？']
          }
        ]
      },
      {
        id: 'motivation',
        order: 2,
        title: '动机确认',
        purpose: '让客户自己说出为什么现在想看，后续成交要回到他的原始理由。',
        question: '你怎么突然想了解香港保险？',
        materials: ['产品定位对比', '教育金时间线', '养老现金流领取逻辑'],
        options: [
          {
            id: 'curious_friend',
            label: '朋友买了好奇',
            talkTrack: '明白。那你现在不是马上要买，而是想知道它为什么值得买。那我先讲适合人群，再看你像不像。',
            followUps: ['朋友买的是哪类？', '你想知道它为什么值得买？']
          },
          {
            id: 'return',
            label: '想看收益',
            talkTrack: '收益可以看，但我先问你一句：你是想跟银行比，跟基金股票比，还是想找一个长期稳一点的美元配置？',
            followUps: ['你想跟什么工具比？', '你能接受多久看收益？']
          },
          {
            id: 'money_nowhere',
            label: '钱不知道放哪里',
            talkTrack: '这个就很具体了。那我们先把你的钱分成短期要用、投资机会、长期不用三类，看哪一类适合拿出来做规划。',
            followUps: ['短期要用的钱有多少？', '长期不用的钱大概多少？']
          },
          {
            id: 'children',
            label: '为了孩子',
            talkTrack: '那重点不是产品收益，而是孩子什么时候可能用钱、用什么币种、每年要多少现金流。',
            followUps: ['孩子什么时候用钱？', '未来是国内还是海外用途？']
          },
          {
            id: 'retirement',
            label: '养老',
            talkTrack: '那重点是未来什么时候开始领、每年想领多少、这笔钱现在能不能长期放。',
            followUps: ['想什么时候开始领？', '每年希望领多少？']
          }
        ]
      },
      {
        id: 'fund_destination',
        order: 3,
        title: '资金去向',
        purpose: '知道这笔钱原本在哪里，才能找到替代关系或互补关系。',
        question: '如果不买这个，你这笔钱原本准备放哪里？',
        materials: ['资金分层表', '进攻/防守资产分工话术', '长期储蓄现金流演示'],
        options: [
          {
            id: 'bank',
            label: '银行',
            talkTrack: '银行解决的是流动性和安全感，但如果这笔钱本来就长期不用，只放银行可能有点浪费。我们可以看长期储蓄是否更适合。',
            followUps: ['这笔钱多久不会动？', '你希望它承担安全还是增值的角色？']
          },
          {
            id: 'fund_stock',
            label: '股票/基金',
            talkTrack: '股票基金可以做进攻，但你会把所有钱都放进去吗？如果不会，剩下那部分钱就需要另一个角色。',
            followUps: ['你会全部放进去吗？', '剩下的钱要扮演什么角色？']
          },
          {
            id: 'property',
            label: '买房',
            talkTrack: '买房的钱肯定不能动。我们只看扣掉买房、装修、备用金之后，还有没有一部分五到十年不用的钱。',
            followUps: ['买房时间确定了吗？', '扣掉买房资金后还有长期不用的钱吗？']
          },
          {
            id: 'company_stock',
            label: '公司股票',
            talkTrack: '你们公司机会好，我不否认。我反而想问，如果这么好，你为什么不全部买进去？',
            followUps: ['你会全部放进去吗？', '你担心的最大波动是什么？']
          },
          {
            id: 'idle',
            label: '暂时闲着',
            talkTrack: '那今天先不讲买不买，我们先给这笔钱定角色：短期备用、进攻投资、长期防守，还是未来现金流？',
            followUps: ['这笔钱现在最该承担什么任务？', '短期备用金留够了吗？']
          },
          {
            id: 'unknown',
            label: '还没想好',
            talkTrack: '没关系，不确定的时候先不要急着买。我们先把钱分层，看看哪一部分不能动，哪一部分可以长期规划。',
            followUps: ['一到三年内会不会用？', '你更怕错过收益还是怕拿不回来？']
          }
        ]
      },
      {
        id: 'duration',
        order: 4,
        title: '使用期限',
        purpose: '判断客户的钱能不能放得住，避免拿短钱做长期储蓄。',
        question: '这笔钱你大概多久不会用？',
        materials: ['短期资金筛选话术', '现金价值和流动性边界', '长期复利演示'],
        options: [
          {
            id: 'one_two_years',
            label: '一两年可能用',
            talkTrack: '那这笔钱不适合做长期保险，先放短期工具。我们只看有没有另一笔长期不用的钱。',
            followUps: ['还有没有另一笔长期不用的钱？', '短期用途大概是什么？']
          },
          {
            id: 'three_five_years',
            label: '三五年不用',
            talkTrack: '那可以初步看，但要把流动性讲清楚。你不能把它当随时进出的账户。',
            followUps: ['五年以上心理上能接受吗？', '有没有备用金？']
          },
          {
            id: 'ten_years',
            label: '十年不用',
            talkTrack: '那这类长期美元储蓄就比较值得看，因为时间越长，它的特点越明显。',
            followUps: ['更偏累积还是未来领取？', '希望什么时候开始动用？']
          },
          {
            id: 'uncertain',
            label: '不确定',
            talkTrack: '不确定就先按保守算。你先留足备用金和短期资金，剩下真正不动的钱再做规划。',
            followUps: ['先按最保守期限算可以吗？', '一到三年内最大支出是什么？']
          }
        ]
      },
      {
        id: 'needs',
        order: 5,
        title: '核心需求排序',
        purpose: '让客户排优先级，避免收益、安全、灵活什么都要。',
        question: '如果只能选一个最重要的，你最在意的是收益、安全、灵活性、美元资产，还是未来能领钱？',
        materials: ['长期演示', '保证/非保证说明', '领取规则和现金流方案'],
        options: [
          {
            id: 'yield',
            label: '收益',
            talkTrack: '可以，那我会重点给你看长期演示，但你也要接受它不是短期产品，非保证部分也不是承诺。',
            followUps: ['你看的是长期收益还是短期收益？', '能接受非保证部分波动吗？']
          },
          {
            id: 'safety',
            label: '安全',
            talkTrack: '那我们先看保证部分、合同结构、公司和监管。收益先放后面。',
            followUps: ['你最担心本金、公司还是香港？', '要不要先看保证部分？']
          },
          {
            id: 'liquidity',
            label: '灵活',
            talkTrack: '那我先确认，你要的灵活是随时全部取，还是未来按年领取？如果要随时全部取，长期储蓄可能不适合。',
            followUps: ['你说的灵活是哪种？', '能接受分阶段领取吗？']
          },
          {
            id: 'usd',
            label: '美元资产',
            talkTrack: '那重点就是币种和境外资产分散，不只是收益。',
            followUps: ['未来美元使用场景是什么？', '你已有多少外币资产？']
          },
          {
            id: 'cashflow',
            label: '未来现金流',
            talkTrack: '那我给你看领取方式，而不是只看账户总值。',
            followUps: ['希望什么时候开始领？', '每年想领多少？']
          }
        ]
      },
      {
        id: 'decision',
        order: 6,
        title: '决策链和异议预判',
        purpose: '提前知道谁会卡单、卡在哪里，避免最后才处理家人反对。',
        question: '这个事情最后是你自己决定，还是需要跟配偶/父母一起看？',
        materials: ['夫妻共同决策版短讲', '安全监管合同资料', '共同会议邀约话术'],
        options: [
          {
            id: 'self',
            label: '自己决定',
            talkTrack: '好，那我们就先按你的需求看。如果方向对，后面再确认流程和资料。',
            followUps: ['如果方向对，下一步你想看方案还是资料？']
          },
          {
            id: 'spouse',
            label: '配偶商量',
            talkTrack: '那我建议下次一起听，不然你回去转述会漏重点。我讲 15 分钟，比你回去解释半天更清楚。',
            followUps: ['配偶最可能担心什么？', '下次一起听方便吗？']
          },
          {
            id: 'parents',
            label: '父母可能不同意',
            talkTrack: '那你先别急着说服他们。你只要问他们最担心什么，把问题带回来，我们一个个拆。',
            followUps: ['他们最担心香港、保险还是资金取回？']
          },
          {
            id: 'family_unknown',
            label: '家人不懂保险',
            talkTrack: '不懂很正常。那我们就不要讲复杂产品，只讲这笔钱放多久、安不安全、怎么拿回来。',
            followUps: ['要不要约一次我来讲？', '他们更想看合同还是资金流程？']
          }
        ]
      },
      {
        id: 'next_step',
        order: 7,
        title: '下一步动作',
        purpose: '每次沟通拿到一个具体动作，避免只停在“我再看看”。',
        question: '下一步我们只做一件事：把方案重点讲清楚，还是先把你这笔钱分层分清楚？',
        materials: ['两个时间选项', '会议邀约话术', '资料清单'],
        options: [
          {
            id: 'meeting',
            label: '约会议',
            talkTrack: '我们约 15 分钟腾讯会议，我讲完再发资料。你今晚 8 点还是明天中午方便？',
            followUps: ['今晚 8 点还是明天中午？', '会议里要不要一起带家人？']
          },
          {
            id: 'segment_money',
            label: '资金分层',
            talkTrack: '我们重新约一次，不是推产品，是把买房、股票、长期规划的钱分开。',
            followUps: ['你方便什么时候做资金分层？']
          },
          {
            id: 'family_meeting',
            label: '见家人',
            talkTrack: '下次把配偶一起拉进来，我讲 15 分钟，你不用自己转述。',
            followUps: ['配偶什么时候方便？']
          },
          {
            id: 'prepare_info',
            label: '收资料',
            talkTrack: '如果方向没问题，我们先把基本信息录一下，不等于马上扣款，就是把流程准备起来。',
            followUps: ['我先发你资料清单可以吗？']
          }
        ]
      }
    ]
  },
  {
    id: 'tpl_education_cashflow',
    name: '教育金规划',
    description: '围绕孩子用钱时间、币种和现金流做初筛',
    version: 1,
    createdAt: now,
    updatedAt: now,
    steps: []
  },
  {
    id: 'tpl_retirement_cashflow',
    name: '养老现金流',
    description: '围绕退休时间、领取金额和长期资金做初筛',
    version: 1,
    createdAt: now,
    updatedAt: now,
    steps: []
  }
];

const OPTION_GUIDANCE: Record<string, { meaning: string; responseStrategy: string }> = {
  friend_referral: {
    meaning: '信任主要来自介绍人，客户还没有完全建立对你本人的判断。',
    responseStrategy: '先承接介绍人的信任，再低压力初筛，不要急着证明产品多好。'
  },
  moments: {
    meaning: '客户被内容种草，通常关心资产配置、美元资产或长期储蓄逻辑。',
    responseStrategy: '沿着他感兴趣的内容继续问，不要立刻进入保险销售口径。'
  },
  funds_ready: {
    meaning: '需求比较近，客户可能已经有一笔钱需要重新安排。',
    responseStrategy: '直接进入资金用途和资金分层，先判断这笔钱适不适合长期规划。'
  },
  casual: {
    meaning: '客户兴趣浅，暂时没有明确购买动机。',
    responseStrategy: '轻讲适合人群和基本概念，控制投入，不要重方案轰炸。'
  },
  curious_friend: {
    meaning: '客户是被身边案例触发，还处在认知阶段。',
    responseStrategy: '先讲适合什么人，再判断客户像不像，暂时不推方案。'
  },
  return: {
    meaning: '客户用收益做入口，但未必清楚比较对象和期限。',
    responseStrategy: '先问他想跟谁比，再把长期储蓄和银行、基金股票区分开。'
  },
  money_nowhere: {
    meaning: '客户有真实资金安排问题，是比较高价值的需求信号。',
    responseStrategy: '立刻做短期、进攻、长期不用三类资金分层。'
  },
  children: {
    meaning: '客户的核心场景偏教育金，重点在时间点、币种和现金流。',
    responseStrategy: '少讲产品总收益，多问孩子用钱时间、用途和每年现金流。'
  },
  retirement: {
    meaning: '客户的核心场景偏养老现金流，重点在什么时候领、领多少。',
    responseStrategy: '围绕退休时间、领取节奏和长期可放资金继续问。'
  },
  bank: {
    meaning: '客户追求安全和流动性，可能有长期闲置资金被低效放在银行。',
    responseStrategy: '先认可银行角色，再只拿长期不用的钱讨论储蓄规划。'
  },
  fund_stock: {
    meaning: '客户接受波动和进攻资产，但未必愿意所有钱都承担波动。',
    responseStrategy: '不要跟股票基金硬比收益，问他剩余资金要不要一个防守角色。'
  },
  property: {
    meaning: '买房资金属于短中期刚性用途，不能直接拿来做长期储蓄。',
    responseStrategy: '先保护买房资金，再看扣除买房、装修、备用金后的长期闲钱。'
  },
  company_stock: {
    meaning: '客户相信公司机会，可能对保险和公司股票做错误 PK。',
    responseStrategy: '不否认机会，反问是否会全部买入，引出资产分工。'
  },
  idle: {
    meaning: '资金暂无任务，是建立资金角色的好切口。',
    responseStrategy: '先给钱定任务：备用、进攻、防守、未来现金流。'
  },
  unknown: {
    meaning: '客户还没想清楚，直接推产品容易失焦。',
    responseStrategy: '先保守处理，问短期用途、期限和最担心的问题。'
  },
  one_two_years: {
    meaning: '资金太短，不适合长期保险。',
    responseStrategy: '直接筛掉这笔钱，只寻找另一笔长期不用的钱。'
  },
  three_five_years: {
    meaning: '可以初筛，但流动性边界必须讲清楚。',
    responseStrategy: '确认备用金和五年以上心理接受度，避免客户当活期账户。'
  },
  ten_years: {
    meaning: '长期属性明确，适合进入长期美元储蓄、复利和现金流讨论。',
    responseStrategy: '重点展示时间带来的累积、领取和传承价值。'
  },
  uncertain: {
    meaning: '期限不明确，风险是拿短钱做长钱。',
    responseStrategy: '按保守期限算，先留足备用金和短期资金。'
  },
  yield: {
    meaning: '客户优先关注回报，但可能忽略期限和非保证边界。',
    responseStrategy: '看长期演示，同时先声明不是短期产品、非保证不等于承诺。'
  },
  safety: {
    meaning: '客户风险敏感，信任建立比收益展示更重要。',
    responseStrategy: '先讲保证部分、合同结构、公司和监管，收益后置。'
  },
  liquidity: {
    meaning: '客户可能把灵活理解成随时全部取。',
    responseStrategy: '先定义灵活，如果要随时进出，就明确长期储蓄不适合。'
  },
  usd: {
    meaning: '客户关注币种和资产分散，不只是收益。',
    responseStrategy: '围绕美元使用场景、境外资产配置和已有外币资产继续问。'
  },
  cashflow: {
    meaning: '客户关注未来按年领取，适合现金流方案表达。',
    responseStrategy: '少看账户总值，多看什么时候领、每年领多少、领多久。'
  },
  self: {
    meaning: '决策链短，可以直接推进方案或资料确认。',
    responseStrategy: '确认方向和下一步动作，不额外制造复杂决策人。'
  },
  spouse: {
    meaning: '配偶可能是关键卡点，客户转述容易变形。',
    responseStrategy: '尽量约共同会议，用 15 分钟短讲替代客户回家解释。'
  },
  parents: {
    meaning: '父母反对多来自安全、香港、保险、资金取回等不确定感。',
    responseStrategy: '不要让客户硬说服父母，先收集反对点再逐个拆解。'
  },
  family_unknown: {
    meaning: '家人认知门槛高，复杂产品语言会增加阻力。',
    responseStrategy: '只讲钱放多久、安不安全、怎么拿回来，必要时约共同会议。'
  },
  meeting: {
    meaning: '客户愿意进入下一轮信息接收，可以推进到会议。',
    responseStrategy: '给两个具体时间选项，讲完再发资料，不开放式问有空没。'
  },
  segment_money: {
    meaning: '客户还卡在资金角色不清楚，先别推产品。',
    responseStrategy: '约一次资金分层，把买房、股票、长期规划的钱拆开。'
  },
  family_meeting: {
    meaning: '关键决策人不在场，继续线上绕容易拖延。',
    responseStrategy: '把配偶或家人拉进下一次 15 分钟说明。'
  },
  prepare_info: {
    meaning: '客户方向基本认可，可以进入流程准备。',
    responseStrategy: '强调录资料不等于马上扣款，只是把流程准备起来。'
  }
};

export const enrichSopTemplate = (template: SopTemplate): SopTemplate => ({
  ...template,
  steps: template.steps.map(step => ({
    ...step,
    options: step.options.map(option => ({
      ...option,
      ...OPTION_GUIDANCE[option.id],
      meaning: option.meaning || OPTION_GUIDANCE[option.id]?.meaning,
      responseStrategy: option.responseStrategy || OPTION_GUIDANCE[option.id]?.responseStrategy
    }))
  }))
});

export const getUsableSopTemplate = (template: SopTemplate): SopTemplate => {
  if (template.steps.length > 0) return enrichSopTemplate(template);
  return enrichSopTemplate({
    ...DEFAULT_SOP_TEMPLATES[0],
    id: template.id,
    name: template.name,
    description: template.description,
    version: template.version,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt
  });
};
