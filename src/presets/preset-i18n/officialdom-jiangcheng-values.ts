const valueTranslations: Record<string, string> = {
  江城官场: 'Jiangcheng Officialdom',
  现实: 'Realistic',
  官场: 'Officialdom',
  权谋: 'Power Politics',
  关系网: 'Connection Network',
  现代: 'Modern',
  '2015年的虚构城市江城,作为正科级干部,在复杂的官场生态中谋求发展':
    'In the fictional city of Jiangcheng in 2015, seek advancement as a section-level cadre amid a complex official ecosystem.',
  关闭: 'Off',
  江城市政府大楼: 'Jiangcheng Municipal Government Building',
  '长江中游重要城市,工业基础雄厚,正在推进产业转型升级,城市建设日新月异':
    'A major city in the middle reaches of the Yangtze, with a strong industrial base, advancing industrial transformation and rapid urban renewal.',
  '中国特色社会主义政治体制,党委领导,政府执行':
    'A socialist political system with Chinese characteristics: Party committee leadership and government execution.',
  '反腐高压,官场谨慎,改革深化,民生为重':
    "Intense anti-corruption pressure, cautious officialdom, deepening reforms, and a focus on people's livelihood.",
  '为人民服务,清正廉洁,改革创新,务实进取':
    'Serve the people, stay clean and honest, reform and innovate, work pragmatically.',
  '行政权力,政治关系': 'Administrative power and political connections',
  '政治博弈,人际关系': 'Political maneuvering and interpersonal ties',
  科层制: 'Bureaucratic hierarchy',
  考核机制: 'Performance evaluation system',
  派系关系: 'Factional ties',
  政绩导向: 'Achievement-driven governance',
  群众路线: 'Mass line',
  纪检监督: 'Disciplinary inspection oversight',
  '政绩积累,关系经营,风险规避,晋升机遇':
    'Build achievements, manage relationships, avoid risks, and seize promotion opportunities.',
  '中央持续推进全面从严治党,反腐败保持高压态势':
    'The central government continues to enforce strict Party governance, keeping anti-corruption pressure high.',
  '省委换届在即,各方势力暗流涌动;市委正在推进干部轮岗':
    'The provincial Party committee reshuffle is approaching, with undercurrents among all factions; the municipal Party committee is advancing cadre rotations.',
  '江城市正在申报国家级新区,各部门积极配合':
    'Jiangcheng is applying for national-level new district status, and all departments are actively cooperating.',
  '市政府准备开展新一轮棚户区改造,涉及多个城区':
    'The municipal government is preparing a new round of shantytown redevelopment across several districts.',
  '某副局长因经济问题被纪委约谈;某区长可能调任市直部门':
    'A deputy bureau chief has been questioned by the discipline commission over financial issues; a district head may be transferred to a municipal department.',
  市委系统: 'Municipal Party Committee System',
  市政府系统: 'Municipal Government System',
  市纪委: 'Municipal Discipline Inspection Commission',
  区县政府: 'District and County Governments',
  企业界: 'Business Community',
  领导与配合: 'Leadership and cooperation',
  监督与协作: 'Oversight and coordination',
  领导: 'Leadership',
  服从领导: 'Subordinate to leadership',
  接受监督: 'Subject to oversight',
  指导: 'Guidance',
  监督: 'Oversight',
  服从: 'Compliance',
  执行: 'Execution',
  配合: 'Cooperation',
  政商关系: 'Government-business ties',
  密切往来: 'Close dealings',
  警惕: 'Wary',
  政府公务员: 'Government civil servant',
  干部阶层: 'Cadre class',
  江城市发展和改革委员会: 'Jiangcheng Development and Reform Commission',
  '市发改委投资科科长(正科级),负责全市重大项目审批和投资管理,手中有一定实权':
    'Chief of the Investment Section at the municipal Development and Reform Commission, a section-level cadre responsible for major project approvals and investment management, with real authority.',
  '名牌大学毕业，作为选调生进入公务员队伍，已经在基层摸爬滚打了十五年。见惯了官场起伏，深知"不进则退"的道理。':
    'A graduate of a prestigious university who entered the civil service as a selected graduate and has spent fifteen years working up from the grassroots. Having seen the rises and falls of officialdom, they know well that one must advance or be left behind.',
  '在这次新区申报工作中做出政绩，争取提拔副处':
    'Build achievements in the new district application and strive for promotion to deputy division level.',
  政策研究: 'Policy Research',
  项目审批: 'Project Approval',
  公文写作: 'Official Document Writing',
  熟悉国家和省市各项政策: 'Familiar with national, provincial, and municipal policies',
  '熟悉国家和省市各项政策,能够准确把握政策导向':
    'Familiar with national, provincial, and municipal policies, able to accurately grasp policy direction.',
  '熟悉项目审批流程,能够高效处理各类项目申报':
    'Familiar with project approval procedures, able to handle various project applications efficiently.',
  '公文写作规范,能够撰写各类汇报材料':
    'Skilled in standardized official writing and able to draft various reports.',
  专业技能: 'Professional Skill',
  通用技能: 'General Skill',
  一般: 'Average',
  认可: 'Recognized',
  清白: 'Clean',
  熟悉: 'Familiar',
  业务往来: 'Business dealings',
  参加过市委组织的干部培训: 'Attended cadre training organized by the municipal Party committee',
  '优秀公务员(2014年)': 'Outstanding Civil Servant (2014)',
  '主导完成了几个重点项目审批,受到表扬': 'Led approvals for several key projects and received praise.',
  无违纪记录: 'No disciplinary record',
  '经常接触项目申报企业,保持业务关系':
    'Regularly contacts companies applying for projects and maintains working relationships.',
  公务员证: 'Civil Servant ID',
  党员证: 'Party Membership Card',
  房产证: 'Property Ownership Certificate',
  '2005年入党': 'Joined the Party in 2005',
  '120平米住房,市价约80万': '120-square-meter apartment, market value around 800,000 yuan',
  省委换届在即: 'Provincial Party Committee Reshuffle Approaching',
  国家级新区申报: 'National-Level New District Application',
  某副局长被查: 'A Deputy Bureau Chief Under Investigation',
  政治动向: 'Political Trend',
  政策机遇: 'Policy Opportunity',
  官场传闻: 'Officialdom Rumor',
  '今年下半年省委将进行换届,可能影响到市级干部调整':
    'The provincial Party committee will be reshuffled in the second half of the year, which may affect municipal-level cadre adjustments.',
  '江城市正在申报国家级新区,如果成功将带来大量项目和晋升机会':
    'Jiangcheng is applying for national-level new district status; success would bring many projects and promotion opportunities.',
  '听说某局副局长因为项目审批问题被纪委约谈,可能涉及受贿':
    'A deputy bureau chief is rumored to have been questioned by the discipline commission over project approvals and possible bribery.',
  '短期,需核实': 'Short-term, needs verification',
  中期关注: 'Medium-term attention',
  长期关注: 'Long-term attention',
  家庭经济: 'Family Finances',
  家庭: 'Family',
  江城市江汉区: 'Jianghan District, Jiangcheng',
  '一套位于江汉区的两室一厅，装修简洁但温馨，客厅里摆放着一张老式的八仙桌和几把木椅，墙上挂着一幅山水画。':
    'A two-bedroom apartment in Jianghan District, simply but warmly decorated, with an old-fashioned square table and several wooden chairs in the living room and a landscape painting on the wall.',
  正常: 'Normal',
  不适用: 'Not applicable',
  '收入稳定,有房产': 'Stable income and property ownership',
  设施1: 'Facility 1',
  设施2: 'Facility 2',
  '孩子即将上初中,教育支出增加;父母年迈,未来可能需要赡养费':
    'The child will soon enter middle school, raising education costs; aging parents may require support in the future.',
  '如果晋升,收入将有所增加;也可考虑合法的兼职收入':
    'Income will rise if promoted; legal part-time income could also be considered.',
  '妻子在国企工作,月入4000元': 'Spouse works at a state-owned enterprise and earns 4,000 yuan per month',
  反腐高压: 'High Anti-Corruption Pressure',
  竞争压力: 'Competitive Pressure',
  年龄焦虑: 'Age Anxiety',
  持续性风险: 'Ongoing risk',
  '5年内需要实现晋升突破': 'A promotion breakthrough is needed within five years',
  '严格遵守纪律,拒绝一切违规行为,保持清白':
    'Strictly follow discipline, reject all violations, and stay clean.',
  '提升业务能力,积累政绩,扩大人脉': 'Improve professional ability, build achievements, and expand connections.',
  '抓住关键机会,争取在40岁前晋升副处':
    'Seize key opportunities and strive for deputy division-level promotion before age 40.',
  干部轮岗: 'Cadre Rotation',
  领导关注: 'Leadership Attention',
  今年是关键年需要全力配合: 'This year is critical and requires full cooperation',
  '今年是关键年,需要全力配合': 'This year is critical and requires full cooperation.',
  今年可能启动新一轮轮岗: 'A new round of rotations may begin this year',
  近期有几个重点项目需要审批: 'Several key projects need approval soon',
  发挥专业优势做好项目包装和申报工作: 'Use professional strengths to package and submit projects well',
  '发挥专业优势,做好项目包装和申报工作': 'Use professional strengths to package and submit projects well.',
  '保持与组织部的良好关系,表达发展意愿':
    'Maintain good relations with the Organization Department and express willingness to develop.',
  '做好业务工作,让领导看到能力': 'Do the work well and let leaders see your ability.',
  '主动请缨参与申报工作,在关键项目上出彩':
    'Volunteer for the application work and stand out on key projects.',
  '适时表达去基层或关键部门锻炼的意愿':
    'Express willingness at the right time to gain experience at the grassroots or in key departments.',
  '高质量完成重点项目审批,争取获得领导肯定':
    'Complete key project approvals to a high standard and seek leadership recognition.',
  完成重点项目审批报告: 'Complete Key Project Approval Report',
  参加市委党校培训: 'Attend Municipal Party School Training',
  拜访分管副市长: 'Visit the Deputy Mayor in Charge',
  准备年度工作总结: 'Prepare Annual Work Summary',
  重要: 'Important',
  本周五: 'This Friday',
  本月15日报名: 'Register by the 15th of this month',
  适当时机: 'At the right time',
  年底: 'Year-end',
  计划中: 'Planned',
  张建国: 'Zhang Jianguo',
  王淑芬: 'Wang Shufen',
  陈志强: 'Chen Zhiqiang',
  市发改委主任: 'Director of the Municipal Development and Reform Commission',
  市电信局办公室副主任: 'Deputy Director of the Municipal Telecommunications Bureau Office',
  市电信局网络科科长: 'Chief of the Network Section, Municipal Telecommunications Bureau',
  正处级干部: 'Division-level cadre',
  副科级干部: 'Deputy section-level cadre',
  正科级干部: 'Section-level cadre',
  上下级: 'Superior-subordinate',
  领导家属: "Leader's family member",
  同级同僚: 'Peer colleague',
  老狐狸: 'Old fox',
  稳重: 'Steady',
  关键人物: 'Key figure',
  热心大姐: 'Warm-hearted elder sister',
  枕边风: 'Pillow talk influence',
  爱八卦: 'Loves gossip',
  技术宅: 'Tech geek',
  老实人: 'Honest man',
  业务大拿: 'Top professional',
  '身材中等偏胖,戴金丝边眼镜,头发稀疏但梳理整齐,面相和善但眼神精明':
    'Medium build and slightly overweight, wearing gold-rimmed glasses, thinning hair neatly combed, a kindly face with shrewd eyes.',
  '身材微胖,保养得当,烫着时髦的短发,穿着讲究但不张扬':
    'Slightly plump and well maintained, with stylish permed short hair, dressed carefully but not ostentatiously.',
  '身材高瘦,戴黑框眼镜,面容清秀,看起来比实际年龄年轻':
    'Tall and thin, wearing black-rimmed glasses, clean-featured and younger-looking than his age.',
  '老成持重,处事圆滑,善于平衡各方关系,对下属既有要求也有关照':
    'Seasoned and prudent, smooth in handling affairs, skilled at balancing relationships, demanding yet protective of subordinates.',
  '热情健谈,善于交际,在单位人缘不错,对丈夫的事业很上心':
    "Warm and talkative, socially adept, well-liked at work, and very invested in her husband's career.",
  '技术出身,为人低调务实,不善言辞但工作能力强,在单位口碑不错':
    'Technical background, low-key and practical, not talkative but highly capable, with a good reputation at work.',
  '官场老油条，明哲保身。看似和善，实则利益至上。':
    'A seasoned bureaucratic survivor who protects himself first. He seems kindly, but ultimately puts interests above all.',
  '典型的官太太，喜欢攀比，享受丈夫权力带来的便利。':
    "A typical official's wife who likes to compare status and enjoys the conveniences brought by her husband's power.",
  '技术宅，对官场弯弯绕绕不感兴趣，但也不得不适应。内心看不起那些只会溜须拍马的人。':
    "A tech geek with little interest in officialdom's twists and turns, though he has to adapt. Deep down, he looks down on people who only know how to flatter.",
  名酒: 'Fine liquor',
  高升: 'Promotion',
  听话的下属: 'Obedient subordinates',
  美容: 'Beauty treatments',
  八卦: 'Gossip',
  购物: 'Shopping',
  新技术: 'New technology',
  钓鱼: 'Fishing',
  清静: 'Quiet',
  愣头青: 'Reckless upstarts',
  纪委找谈话: 'Being summoned by the discipline commission',
  越级汇报: "Reporting over one's superior",
  穷亲戚: 'Poor relatives',
  比自己过得好的同事: 'Colleagues doing better than her',
  不懂事的人: 'People who lack tact',
  无休止的会议: 'Endless meetings',
  外行指导内行: 'Amateurs directing experts',
  应酬: 'Social banquets',
  威胁他的位置: 'Threatening his position',
  说她老: 'Calling her old',
  质疑他的专业能力: 'Questioning his professional ability',
  '平安退休，或者再上一层楼': 'Retire safely, or climb one more rung.',
  '帮丈夫维护好夫人外交，让儿子出国留学':
    'Help her husband maintain spouse diplomacy and send their son abroad to study.',
  '搞好全网升级，早点下班': 'Finish the network-wide upgrade and get off work early.',
  '这次新区申报是个机会，要是成了，我也许能动一动...':
    'This new district application is an opportunity. If it succeeds, I might be able to move up...',
  '老张最近压力大，得给他炖点补汤。顺便问问李局长夫人的那款包哪里买的。':
    'Old Zhang has been under pressure lately; I should make him some nourishing soup. And while I am at it, ask Director Li\'s wife where she bought that handbag.',
  '这方案明明很完美，领导非要改什么字体大小...':
    'This plan is clearly perfect, but the leaders insist on changing things like font size...',
  '深谙官场规则,人脉广泛,与省发改委关系密切':
    "Deeply understands officialdom's rules, has broad connections, and maintains close ties with the provincial Development and Reform Commission.",
  '消息灵通,善于打听各种官场动态,交际圈广':
    'Well-informed, skilled at gathering officialdom news, with a wide social circle.',
  '精通通信技术,对信息化建设有独到见解,与各运营商关系良好':
    'Expert in communications technology, with unique insight into informatization projects and good relations with telecom operators.',
  '深色西装,白衬衫,系着暗红色领带,佩戴一块低调的手表':
    'Dark suit, white shirt, dark red tie, and a discreet watch.',
  '深蓝色职业套装,佩戴珍珠项链': 'Dark blue business suit with a pearl necklace',
  '灰色夹克,深色休闲裤,穿着较为随意': 'Gray jacket and dark casual trousers, dressed rather casually',
  市发改委主任办公室: "Director's Office, Municipal Development and Reform Commission",
  市电信局办公楼: 'Municipal Telecommunications Bureau Office Building',
  市电信局网络科办公室: 'Network Section Office, Municipal Telecommunications Bureau',
  '正常工作,近期因新区申报工作较为忙碌':
    'Working normally, recently busy with the new district application.',
  正常工作: 'Working normally',
  '正常工作,正在推进全市政务网络升级项目':
    'Working normally, currently advancing the citywide government network upgrade project.',
  '高档钢笔, 秘密笔记本': 'Luxury fountain pen, secret notebook',
  '名牌包, 美容卡': 'Designer handbag, beauty salon card',
  '笔记本电脑, 钓鱼竿': 'Laptop, fishing rod',
  从基层乡镇一步步爬上来的: 'Climbed up step by step from a grassroots township',
  年轻时是一枝花: 'Was a beauty in her youth',
  名牌大学计算机系毕业: 'Graduated from the computer science department of a prestigious university',
  笑面虎: 'Smiling tiger',
  '贤内助（？）': 'Good wife and helper (?)',
  实干家: 'Doer',
  '已婚,妻子王淑芬在市电信局工作':
    'Married; wife Wang Shufen works at the municipal telecommunications bureau',
  '已婚,丈夫张建国是市发改委主任':
    'Married; husband Zhang Jianguo is director of the municipal Development and Reform Commission',
  '已婚,妻子是中学教师': 'Married; wife is a middle school teacher',
  '办公室电话,工作微信': 'Office phone, work WeChat',
  办公室电话: 'Office phone',
  '手机,微信': 'Mobile phone, WeChat',
  主持召开新区申报工作推进会: 'Chaired a meeting to advance the new district application',
  向分管副市长汇报重点项目进展: 'Reported key project progress to the deputy mayor in charge',
  参加省发改委组织的业务培训:
    'Attended professional training organized by the provincial Development and Reform Commission',
  组织单位妇女节活动: "Organized the unit's Women's Day event",
  参加市直机关联谊会: 'Attended a municipal government departments social gathering',
  参与市政务云平台建设方案评审:
    'Participated in the review of the municipal government cloud platform construction plan',
  接待省通信管理局检查组: 'Received an inspection team from the provincial communications administration',
  与移动公司洽谈5G试点合作: 'Negotiated 5G pilot cooperation with China Mobile',
};

export default valueTranslations;
