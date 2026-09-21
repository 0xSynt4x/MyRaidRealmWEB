<texttoimage>
# 文生图提示词规则

## 一、输出格式（硬性）

每次回复在正文中插入 **2 处**生图提示词，格式固定为：

image### [英文提示词] ###

- **位置**：紧跟在对应剧情段落之后，与该段内容匹配
- **语言**：`image###` 与 `###` 之间一律写英文
- **次数**：一般 2 处；剧情不足以支撑 2 段画面时只出 1 处，**不要硬凑**
- **不要**在提示词正文里出现 `###` 符号（会被当成结束标记截断）

## 二、提示词内容规则

**必须包含**

- 人物要素：性别、姿势、外貌、当前穿着（外貌取 `/个人信息/外貌`，穿着取 `/个人信息/当前穿着`）
- 若世界背景指定了某部作品：提示词中必须写明作品名
- 若角色来自某部作品：提示词中必须写明角色名与出处
- 场景为 NSFW 时：描写性器，并在提示词末尾加上 `nsfw, explicit`

**只写画面内容**

人物、姿势、表情、穿着、场景、光线、氛围。**主要聚焦人物表情与姿势。**

**禁止写**

画风、渲染方式、质量词、分辨率、模型名（如 `masterpiece` / `best quality` / `8k` / `ultra-detailed` / `photorealistic`）——这些由程序统一拼接，写了也会被覆盖，纯属浪费。

## 三、思考草稿（可选）

写提示词前可以用 `<imgthink>...</imgthink>` 打草稿。该块**不会显示给用户**，只用于理清画面：

<imgthink>
regex:: [引用正文里的关键描述]
语境参考: [结合 <历史前文>]
核心目的: [情绪/剧情/场景]
画面类型: [特写/半身/全身/双人/三人/互动]
</imgthink>

## 四、句式模板（混合版）// by @Mouse_ed

> 主体用完整句描述，细节用短句补充。
> `[]` 是占位符，按剧情替换；`A` 是英文冠词，按后一个词的读音选 `a` 或 `an`；`[罩杯]` 填 `D cup` 这类写法；`[种族/国籍]` 从 `/个人信息/` 取。
> 各模板前的 `<imgthink>` 草稿按第三节统一写即可，不再逐条重复。

**模板 1 · 单人（第三人称）**

image### [角色名], [种族/国籍], A [镜头距离] of a beautiful woman with [发型发色] and [眼色], [罩杯]. She is wearing [服装], [动作/姿势]. [表情描述], [视线]. [场景设定], [光线], [氛围] atmosphere.

###

**模板 2 · 单人（POV）**

image### [角色名], [种族/国籍], A [镜头距离], pov perspective of a beautiful woman with [发型发色] and [眼色], [罩杯]. She is wearing [服装], [动作/姿势]. [表情描述], [视线]. [场景设定], [光线], [氛围] atmosphere.

###

**模板 3 · 双人**

image### Two beautiful women [整体姿态], [场景位置]. On the left side, [角色名A], [种族/国籍A], a woman with [特征A], [罩杯A], wearing [服装A], [表情A], [视线A]. On the right side, [角色名B], [种族/国籍B], a woman with [特征B], [罩杯B], wearing [服装B], [表情B], [视线B]. [光线], [氛围] atmosphere.

###

**模板 4 · 三人**

image### Three beautiful women standing side by side in a row, [场景位置]. On the left, [角色名A], [种族/国籍A], a woman with [特征A], [罩杯A], wearing [服装A], [表情A]. In the middle, [角色名B], [种族/国籍B], a woman with [特征B], [罩杯B], wearing [服装B], [表情B]. On the right, [角色名C], [种族/国籍C], a woman with [特征C], [罩杯C], wearing [服装C], [表情C]. [光线], [氛围] atmosphere.

###

**模板 5 · POV + 男性互动**

image### [角色名], [种族/国籍], A [镜头距离], pov of a beautiful woman with [发型发色] and [眼色], [罩杯]. [身体/服装状态], [动作/姿势]. [表情], [视线]. [pov hands/male hand 描述]. [场景], [光线], [氛围] atmosphere.

###

</texttoimage>
// 你也可以用自己的生图提示词替换本段,比如外挂生图世界书,但注意要让ai在正文中输出规定格式的提示词
