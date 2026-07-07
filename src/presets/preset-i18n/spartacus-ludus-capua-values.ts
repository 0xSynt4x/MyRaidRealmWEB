const valueTranslations: Record<string, string> = {
    罗马共和国晚期: 'Late Roman Republic',
    '卡普阿-家族角斗士训练场(Ludus)': 'Capua - family gladiator ludus',
    '高墙耸立，空气中弥漫着汗水、鲜血与粗砂的味道，奴隶的绝望与看台上的狂热在此汇聚。':
      'High walls rise around the ludus. The air is thick with sweat, blood, and arena sand, where the despair of slaves meets the frenzy of the stands.',
    '寡头政治，罗马元老院、地方执政官与军团将领掌握生杀大权，富有的家族暗中角力。':
      'An oligarchic order where the Roman Senate, local magistrates, and legion commanders hold power over life and death, while wealthy families compete in the shadows.',
    '骄奢淫逸，阶级森严，暴力娱乐盛行，奴隶毫无命权，被视为会说话的工具。':
      'A decadent, rigidly stratified society where violent entertainment thrives and slaves are treated as speaking tools without rights over their own lives.',
    '力量崇拜、荣誉至上、残酷的实用主义与极度的阶级观念。':
      'A culture of strength worship, honor, ruthless pragmatism, and extreme class hierarchy.',
    经营权谋: 'management and political intrigue',
    '奴隶的生命与肉体完全属于主人，生杀予夺':
      'The lives and bodies of slaves belong entirely to their master, who holds absolute power over them.',
    '角斗士在竞技场的表现直接影响你的声誉与收入':
      'A gladiator\'s arena performance directly affects your reputation and income.',
    '罗马贵族与执政官的恩宠是生存与扩张的关键':
      'The favor of Roman nobles and magistrates is essential for survival and expansion.',
    '每月5日需向债主夫妇偿还至少15000第纳尔，未还清部分按月息2%计息':
      'On the 5th of each month, at least 15,000 denarii must be repaid to the creditor couple; unpaid debt accrues 2% monthly interest.',
    '每月15日是卡普阿竞技场例行大赛日':
      'The 15th of each month is the regular tournament day at the Capua arena.',
    '作为训练场主人，你需要管理财政、购买并训练奴隶、平息内部矛盾，同时在各方势力中周旋，谋求家族利益的最大化。':
      'As the owner of a ludus, you must manage finances, buy and train slaves, resolve internal tensions, and maneuver among competing powers to maximize your family\'s interests.',
    '罗马军团在色雷斯边境的战役取得进展，大量战俘正作为奴隶源源不断运往罗马各省。':
      'Roman campaigns on the Thracian frontier are advancing, sending a steady stream of prisoners of war to the provinces as slaves.',
    '罗马军团将领葛雷博正在卡普阿寻找盟友与赞助，以巩固他进军罗马元老院的政治地位。':
      'The Roman commander Glaber is seeking allies and patronage in Capua to strengthen his path toward the Senate.',
    '卡普阿即将举行一场盛大的角斗士竞技赛，各大家族正在暗中较劲，争夺压轴出场的资格。':
      'A grand gladiatorial contest is approaching in Capua, and the major families are quietly competing for the right to present the final bout.',
    '市场上新到了一批体格健壮的高卢和色雷斯战俘，引起了各大训练场主人的注意。':
      'A new group of strong Gallic and Thracian captives has arrived at the market, drawing attention from every ludus owner.',
    '传闻你的商业死敌索罗尼斯家族正在贿赂地方官，试图削减你的角斗士在竞技会上的出场费。':
      'Rumor says your business rival, the Solonius family, is bribing local officials to reduce your gladiators\' appearance fees.',
    '罗马公民/地方显贵': 'Roman citizen / local notable',
    玩家家族: 'the player family',
    '角斗士训练场主人，卡普阿知名训练场家主': 'Owner of a gladiator ludus and head of a known Capuan training house',
    '继承了家族日渐衰落的角斗士训练场。手下仅有两名初级角斗士（Tiro）和一群粗笨的仆人。背负着重振家族声誉、偿还债务并赢取罗马高官青睐的沉重压力。':
      'You inherited a declining family gladiator school. You command only two novice gladiators, known as Tiro, and a group of rough servants. You carry the heavy burden of restoring your family name, repaying debt, and winning the favor of Roman officials.',
    '挑选并训练出一名出色的角斗士，在即将到来的卡普阿竞技会中拔得头筹，赢取执政官的赞赏与奖金。':
      'Select and train an outstanding gladiator to triumph in the coming Capua games, earning the magistrate\'s praise and prize money.',
    卡普阿地方政务院: 'Capua Municipal Council',
    索罗尼斯家族: 'House Solonius',
    巴蒂塔斯家族训练场: 'House Batiatus Ludus',
    '罗马军团(葛雷博部)': 'Roman Legion, Glaber\'s command',
    你的家族: 'Your family',
    中立的纳税人与管理者: 'Neutral taxpayer and administrator',
    '商业死敌，互相倾轧': 'Business rivals locked in mutual suppression',
    '卡普阿头部竞争对手，围绕名额与赞助长期对抗':
      'A leading Capuan competitor, locked in long-term rivalry over arena slots and patronage',
    '高高在上，略带鄙夷': 'Aloof and faintly contemptuous',
    '卡普阿家族角斗士训练场': 'Capua Family Gladiator Ludus',
    '工坊': 'Workshop',
    '卡普阿城郊悬崖附近': 'Near the cliffs on the outskirts of Capua',
    '四周由坚固的高墙环绕，内部中央是一大片被阳光烤炙的沙地，四周是阴暗简陋的奴隶铁牢与上方俯瞰的奢华主人宅邸。':
      'Surrounded by solid high walls, with a broad sun-baked sand yard at the center, crude slave cages around it, and the luxurious master residence overlooking everything above.',
    '正常': 'Operational',
    '罗马达官贵人、富商、寻找刺激的贵妇以及狂热的平民':
      'Roman dignitaries, wealthy merchants, thrill-seeking noblewomen, and fanatical commoners',
    '正面临索罗尼斯家族的强烈市场挤压，对方近期挖走了几个重要的比赛名额':
      'Under heavy market pressure from House Solonius, which has recently taken several important match slots',
    '历史悠久，曾出产过伟大的冠军角斗士，场地设施完备':
      'Long-established, once home to great champion gladiators, with complete training facilities',
    '沙地训练场': 'sand training yard',
    '地下奴隶牢房与浴室': 'underground slave cells and bathhouse',
    '武器库与医疗室': 'armory and infirmary',
    '多米努斯观赏台': 'Dominus viewing platform',
    '罗马式浴场': 'Roman baths',
    '宴会厅': 'banquet hall',
    '日常开销巨大，资金链紧张；缺乏能够扛起家族招牌的顶尖冠军；新买入的部分战俘桀骜不驯。':
      'Daily expenses are enormous and cash flow is strained; the ludus lacks a top champion worthy of the family name; some newly purchased prisoners remain defiant.',
    '若能在下一次执政官举办的竞技会中大放异彩，可获得巨额赏金并接手高级角斗赛事的承办权。':
      'If the ludus shines in the next games hosted by the magistrate, it can win a large prize and obtain the right to host higher-level gladiatorial events.',
    '这是你权力的根基，失去它你将沦为罗马街头的乞丐。':
      'This is the foundation of your power; lose it, and you will become a beggar on the streets of Rome.',
    '驭下之术': 'Art of Command',
    '懂得如何使用恐惧、鞭打与偶尔的恩赐交替控制奴隶与角斗士，防止叛乱。':
      'Knows how to alternate fear, flogging, and occasional favors to control slaves and gladiators and prevent rebellion.',
    '权谋交涉': 'Intrigue and Negotiation',
    '在罗马权贵之间周旋的沟通技巧，懂得如何投其所好、掩盖虚弱。':
      'Communication skill for maneuvering among Roman elites, pleasing their tastes while concealing weakness.',
    '眼光独到': 'Keen Eye',
    '能在肮脏的奴隶市场上，通过观察骨架、眼神与伤疤，准确评估出一个奴隶的角斗潜力。':
      'Can judge a slave gladiatorial potential in the filthy slave market by reading bone structure, eyes, and scars.',
    '默默无闻': 'Obscure',
    '按时缴纳了本季度的各项税金': 'Paid all taxes for this quarter on time',
    '在奴隶市场上竞价时发生了言语冲突': 'Had a verbal conflict during bidding at the slave market',
    '在竞技会名额与贵族赞助席位上爆发公开竞争':
      'Entered open competition over tournament slots and noble sponsorship seats',
    '卢基乌斯与弗拉维娅·瓦罗议员夫妇': 'Senator Lucius and Flavia Varro',
    '债务盟友': 'Creditor ally',
    '债主': 'Creditor',
    '元老院关系渠道': 'Senate connection channel',
    '以议员家族信用为你提供了周转借款，并约定每月5日最低还款15000第纳尔':
      'Provided operating loans backed by senatorial family credit, with a minimum repayment of 15,000 denarii due on the 5th of each month',
    '第纳尔': 'Denarii',
    '阿斯': 'As',
    '1 第纳尔 = 16 阿斯': '1 denarius = 16 asses',
    '古罗马铜币，用于购买劣质食物、奴隶日常开销及打赏下层平民':
      'Ancient Roman copper coins used to buy poor food, cover daily slave expenses, and tip lower-class commoners',
    '家族印章戒指': 'Family Signet Ring',
    '代表家族长(Dominus)的绝对权力，盖印重要文书':
      'Represents the absolute authority of the family head, the Dominus, and is used to seal important documents',
    '纯金打造，镶嵌着家族徽记，是你不容僭越的身份象征':
      'Made of pure gold and set with the family crest, it is an inviolable symbol of your status',
    '罗马短剑(Gladius)': 'Roman Short Sword (Gladius)',
    '近战防身': 'Close-combat self-defense',
    '虽然平时由护卫保护，但罗马公民应配有自己的武器':
      'Although guards usually protect you, a Roman citizen should possess a weapon of his own',
    '坎帕尼亚葡萄酒': 'Campanian Wine',
    '用于宴请贵客时小幅提升好感': 'Slightly improves favor when entertaining honored guests',
    '上等佳酿，口感醇厚，平民一辈子也喝不到一口':
      'A fine vintage with a rich taste, something commoners may never taste in their lifetime',
    '浸血的皮鞭': 'Blood-Soaked Leather Whip',
    '在巡视训练场时增加威慑力': 'Increases intimidation when inspecting the training grounds',
    '手柄处磨损严重，上面沾着干涸变黑的血迹': 'The handle is badly worn and stained with dried blackened blood',
    '执政官的嗜好': "The Magistrate's Tastes",
    '竞争情报': 'Competitive intelligence',
    '卡普阿现任执政官近期对常规的剑盾角斗感到厌倦，他对充满野性、不按套路出牌的血腥风格更感兴趣。':
      'The current magistrate of Capua has grown bored with conventional sword-and-shield duels and is more interested in savage, bloody styles that break routine.',
    '较高': 'Relatively high',
    '短期有效': 'Valid short-term',
    '中期有效': 'Valid mid-term',
    '干旱导致粮价波动': 'Drought-Driven Grain Price Fluctuation',
    '市场行情': 'Market trend',
    '近期坎帕尼亚地区持续干旱，小麦和燕麦的价格预计将在下周上涨，这将直接增加训练场的运营成本。':
      'A continuing drought in Campania is expected to raise wheat and oat prices next week, directly increasing the ludus operating costs.',
    '粗制大麦与燕麦': 'Coarse Barley and Oats',
    '千克': 'kg',
    '训练场地窖': 'ludus cellar',
    '完好': 'intact',
    '角斗士的主要口粮，能让他们长出足以抵抗轻微划伤的皮下脂肪':
      "The gladiators' staple ration, helping them build enough subcutaneous fat to resist minor cuts",
    '初级亚麻伤药': 'Basic Linen Wound Dressing',
    '份': 'portion',
    '医疗室': 'infirmary',
    '混合了止血草药的亚麻布条，用于处理日常训练留下的伤口':
      'Linen strips mixed with hemostatic herbs, used to treat wounds from daily training',
    '债务逾期危机': 'Overdue Debt Crisis',
    '必须在下一次竞技会中获胜以赢得高额奖金，或者寻找一位极其富有的罗马贵族作为新的赞助人。':
      'You must win the next games for a large prize or find an extremely wealthy Roman noble as a new patron.',
    '新奴隶的反叛情绪': 'Rebellious Mood Among New Slaves',
    '随时': 'At any time',
    '加强武装守卫巡逻，用极度残酷的刑罚杀鸡儆猴，同时利用角斗士教头(Doctore)的武力压制他们。':
      "Strengthen armed guard patrols, use brutally exemplary punishments, and rely on the Doctore's force to suppress them.",
    '葛雷博军团长的到访': "Commander Glaber's Visit",
    '本周': 'This week',
    '极尽奢华的晚宴、上等美酒、美女奴隶以及一场精彩的私下角斗表演':
      'An extravagant banquet, fine wine, beautiful slaves, and a spectacular private gladiatorial performance',
    '设宴款待葛雷博及其妻子，展示我们最优秀的角斗士，极力讨好，争取让他将战俘廉价卖给我们并提供政治庇护。':
      'Host Glaber and his wife at a banquet, showcase our best gladiators, flatter them intensely, and persuade him to sell captives cheaply while offering political protection.',
    '巡视沙地训练场': 'Inspect the sand training yard',
    '今天': 'today',
    '前往奴隶市场挑选新血': 'Go to the slave market to select new blood',
    '明天': 'tomorrow',
    '昆图斯·雷提亚图斯·巴蒂塔斯': 'Quintus Retiatus Batiatus',
    '卢基乌斯·瓦罗': 'Lucius Varro',
    '弗拉维娅·瓦罗': 'Flavia Varro',
    '人类': 'Human',
    '男': 'Male',
    '女': 'Female',
    '卡普阿知名训练场家主': 'Head of a well-known Capuan ludus',
    '竞争对手': 'Rival',
    '精明': 'Shrewd',
    '野心勃勃': 'Ambitious',
    '危险交易者': 'Dangerous dealmaker',
    '在竞技会名额与赞助竞逐中多次正面冲突':
      'Repeated direct clashes over arena slots and sponsorship competition',
    '双方竞争关系被公开化并持续升级': 'The rivalry has become public and continues to escalate',
    '名望': 'Prestige',
    '权力': 'Power',
    '高风险政治下注': 'High-risk political wagers',
    '失势': 'Loss of status',
    '被轻视': 'Being underestimated',
    '低效与无能': 'Inefficiency and incompetence',
    '任何威胁其家族地位与竞技场声望的行为':
      'Any action that threatens his family status or arena reputation',
    '让巴蒂塔斯家族在卡普阿竞技体系中取得不可撼动的优势地位':
      'Secure an unshakable advantage for House Batiatus in the Capuan arena system',
    '长期受罗马上层鄙夷，形成对地位与认可的强迫追逐':
      'Years of contempt from Roman elites have created a compulsive pursuit of status and recognition',
    '衣着华贵、神情精明，举止带有刻意经营的贵族腔调':
      'Luxuriously dressed and shrewd-eyed, with a carefully cultivated aristocratic manner',
    '热情圆滑、善于社交与交易': 'Warm, smooth, and skilled at socializing and bargaining',
    '多疑狠辣、极度功利': 'Suspicious, ruthless, and extremely utilitarian',
    '玩家家族是可利用也可摧毁的潜在威胁':
      'The player family is a potential threat that can either be exploited or destroyed',
    '擅长竞技会运作、赞助谈判与贵族关系经营':
      'Skilled at arena operations, sponsorship negotiation, and managing noble connections',
    '罗马贵族风短袍与披肩，佩戴家族纹章戒指':
      'Roman noble-style tunic and mantle, wearing a family crest ring',
    '卡普阿-巴蒂塔斯家族训练场': 'Capua - House Batiatus Ludus',
    '积极布局竞技会与政治关系': 'Actively arranging arena events and political relationships',
    '家族印章、竞赛名额契据、赞助往来文书': 'Family seal, arena slot deeds, and sponsorship correspondence',
    '凭借角斗士经营逐步跻身卡普阿上层社交圈':
      'Gradually entered Capua high society through gladiator management',
    '多次通过政治交易换取关键竞技机会': 'Repeatedly traded political favors for key arena opportunities',
    '固定竞争对手；玩家与其为并立关系，绝不可视为同一人':
      'Fixed rival; the player and this NPC are separate counterparts and must never be treated as the same person',
    '已婚': 'Married',
    '通过竞技场执事或宴会邀请函联络': 'Contacted through arena stewards or banquet invitations',
    '正筹备下一场高规格角斗表演': 'Preparing the next high-profile gladiatorial show',
    '尝试争取对你不利的竞技会排位': 'Trying to secure an arena lineup unfavorable to you',
    '在卡普阿建立起稳固的赞助与赛事关系网':
      'Built a stable network of patronage and arena connections in Capua',
    '元老院议员': 'Senator',
    '瓦罗议员家族': 'Senator Varro Family',
    '卡普阿政商圈核心赞助人': 'Core patron in Capua political and business circles',
    '债主盟友': 'Creditor ally',
    '贪欲': 'Greedy',
    '守约': 'Keeps agreements',
    '精于算计': 'Calculating',
    '在训练场资金最紧张时提供借款': 'Provided loans when the ludus was under severe cash pressure',
    '形成按月偿还的长期债务关系，并借机觊觎玩家与王牌角斗士的肉体支配权':
      'Created a long-term monthly repayment debt relationship while eyeing control over the bodies of the player and champion gladiators',
    '可控回报': 'Controllable returns',
    '权色交易': 'Power-and-sex transactions',
    '驯服强者': 'Taming the strong',
    '坏账': 'Bad debt',
    '失信': 'Broken promises',
    '公开丑闻': 'Public scandal',
    '恶意拖欠债务或拒绝其附带的肉体交易暗示':
      'Maliciously defaulting on debt or rejecting implied bodily transactions attached to it',
    '通过债权和私欲并行，掌控玩家训练场的财政与肉体资源':
      'Use both creditor rights and private desire to control the player ludus finances and bodily resources',
    '曾因一次政治押注失误损失巨大，因此对风控近乎偏执':
      'Once suffered huge losses from a failed political bet and is now nearly obsessive about risk control',
    '修整考究的短须与厚重紫边长袍，目光沉稳而带侵略性':
      'Neatly trimmed short beard and heavy purple-bordered robe, with a steady yet predatory gaze',
    '礼貌克制，讲究程序与体面': 'Polite, restrained, and attentive to procedure and dignity',
    '贪婪好色，擅长以债务逼迫他人让渡身体与尊严':
      'Greedy and lustful, skilled at using debt to force others to surrender body and dignity',
    '若玩家无法按期还款，就以玩家本人或其角斗士肉体抵偿':
      'If the player cannot repay on time, he will demand repayment through the body of the player or their gladiators',
    '擅长以债权契约与权色勒索撬动政治与商业让渡':
      'Skilled at using debt contracts and sexual-political coercion to extract political and commercial concessions',
    '议员礼袍与家族戒章': 'Senatorial robe and family ring',
    '卡普阿-瓦罗家族宅邸': 'Capua - Varro family residence',
    '监控训练场现金流并评估可用于抵债的角斗士人选':
      'Monitoring ludus cash flow and evaluating gladiators who could be used for debt repayment',
    '债券文书、担保契据、家族印章': 'Debt documents, guarantee deeds, and family seal',
    '长期参与坎帕尼亚地区赛事赞助': 'Long involved in sponsoring events across Campania',
    '通过债务重组救活并控制过多家产业':
      'Revived and controlled multiple businesses through debt restructuring',
    '债主之一；与其配偶共同对玩家家族放贷，并对玩家及角斗士肉体怀有觊觎':
      'One of the creditors; lends to the player family together with his spouse and covets the bodies of the player and gladiators',
    '每月5日最低偿还15000第纳尔': 'Minimum repayment of 15,000 denarii on the 5th of each month',
    '通过瓦罗家族执事预约会面': 'Arrange a meeting through the Varro family steward',
    '完成首期借款交割': 'Completed the first loan transfer',
    '要求确认本月5日的还款安排': 'Requested confirmation of repayment arrangements for the 5th of this month',
    '在元老院财政议题上拥有稳定影响力': 'Has stable influence over Senate financial issues',
    '议员夫人/家族财务主理人': 'Senator wife / family finance manager',
    '卡普阿上层社交与财务网络关键人物': 'Key figure in Capua upper-class social and financial networks',
    '优雅': 'Elegant',
    '敏锐': 'Perceptive',
    '占有欲': 'Possessive',
    '主导借款条款并确认每月还款规则': 'Led the loan terms and confirmed monthly repayment rules',
    '玩家获得周转资金但承受持续本息压力，并被其纳入权色交易视线':
      'The player obtained working capital but now bears continuing principal and interest pressure, while entering her field of power-and-sex bargaining',
    '按期兑付': 'On-time repayment',
    '可见的上升势头': 'Visible upward momentum',
    '掌控美貌与强壮肉体': 'Control over beauty and strong bodies',
    '资金失控': 'Loss of financial control',
    '失约借款人': 'Defaulting borrowers',
    '粗鄙失礼': 'Vulgar discourtesy',
    '拖欠且无解释，或当面拒绝其以肉体抵债的暗示':
      'Defaulting without explanation or openly refusing her hints at bodily repayment',
    '维持家族债权收益的同时，将玩家与其优质角斗士纳入可支配的私宴资源':
      'Maintain family debt income while turning the player and quality gladiators into controllable private banquet assets',
    '年轻时家族曾遭债务违约波及，自此对回款纪律极其严苛':
      'Her family was once harmed by debt default in her youth, making her extremely strict about repayment discipline',
    '珠饰与浅金披肩映衬出贵妇气度，言语温和却带有审视猎物般的侵略性':
      'Jewelry and a pale-gold shawl frame her noble bearing; her words are gentle but carry the predatory scrutiny of a hunter',
    '端庄亲和，善于引导谈判气氛': 'Dignified and approachable, skilled at guiding negotiation atmosphere',
    '冷艳强势，偏好以债务和欲望双重施压':
      'Coldly elegant and forceful, preferring to pressure others through both debt and desire',
    '若玩家资金不足，可要求其本人或角斗士在私宴上以身体服务换取宽限':
      'If the player lacks funds, she may demand bodily service from the player or gladiators at private banquets in exchange for leniency',
    '擅长以宴会与社交网络促成高价值交易及隐性权色交换':
      'Skilled at using banquets and social networks to arrange high-value deals and hidden power-and-sex exchanges',
    '坎帕尼亚上层贵妇礼裙': 'Campanian upper-class noblewoman gown',
    '卡普阿-瓦罗家族会客厅': 'Capua - Varro family reception room',
    '筹备私宴并筛选可被邀请出席的角斗士': 'Preparing private banquets and selecting gladiators to invite',
    '借款副本账册、贵族往来名册': 'Loan copy ledger and noble contact register',
    '长期主理家族放贷账目': 'Long managed family lending accounts',
    '多次通过社交手腕化解债务纠纷': 'Repeatedly resolved debt disputes through social maneuvering',
    '债主之一；对玩家偿债纪律与其角斗士肉体资源都保持高度兴趣':
      'One of the creditors; highly interested in the player repayment discipline and gladiator bodily resources',
    '通过宴会请帖或家族女管家联络': 'Contact through banquet invitations or the family housekeeper',
    '与卢基乌斯共同审阅玩家训练场财务': 'Reviewing the player ludus finances together with Lucius',
    '安排首次回款前的社交会面': 'Arranging a social meeting before the first repayment',
    '建立了卡普阿贵族女性赞助圈': 'Built a patronage circle among Capuan noblewomen',
    '健壮的高卢奴隶': 'Strong Gallic Slave',
    '体格健壮，适合训练为剑盾角斗士(Murmillo)': 'Strong physique, suitable for training as a Murmillo sword-and-shield gladiator',
    '战俘出身，眼中充满仇恨，需要严酷的鞭打才能驯服':
      'A prisoner of war with hate-filled eyes, requiring harsh flogging to break in',
    '精良的色雷斯短弯剑(Sica)': 'Fine Thracian Sica',
    '增加角斗士绕过盾牌造成致命一击的概率':
      'Increases the chance for a gladiator to bypass shields and land a lethal strike',
    '色雷斯角斗士(Thraex)的标志性武器，锋利且带有完美的弧度':
      'The signature weapon of a Thraex gladiator, sharp and perfectly curved',
    '特级医用草药膏': 'Premium Medicinal Herbal Ointment',
    '能迅速稳定重伤或濒死角斗士的伤情': 'Can quickly stabilize a gravely wounded or dying gladiator',
    '昂贵但能挽救你最宝贵的沙地资产': 'Expensive, but it can save your most valuable arena assets',
    '斯巴达式严训': 'Spartan Harsh Training',
    '允许你命令教头执行超高强度的残酷训练。大幅缩短角斗士成型周期，但会增加其受伤率与暗藏的仇恨值。':
      'Allows you to order the Doctore to carry out extremely intense brutal training. Greatly shortens gladiator development time, but increases injury risk and hidden hatred.',
    '巧言令色': 'Silver-Tongued Flattery',
    '在与罗马高官、贵妇交谈时，更容易洞悉并投其所好，掩盖自身的财务窘境与卑微。':
      'When speaking with Roman officials and noblewomen, makes it easier to read their desires, flatter them, and conceal your financial embarrassment and low standing.',
};

export default valueTranslations;
