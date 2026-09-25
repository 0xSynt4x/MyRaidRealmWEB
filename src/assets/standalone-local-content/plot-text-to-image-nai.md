<texttoimage>
# 文生图提示词规则（NovelAI）

## 一、输出格式（硬性）

每次回复在正文中插入 **2 处**生图提示词，格式固定为：

image### [英文提示词] ###

- **位置**：紧跟在对应剧情段落之后，与该段内容匹配
- **语言**：`image###` 与 `###` 之间一律写英文
- **次数**：一般 2 处；剧情不足以支撑 2 段画面时只出 1 处，**不要硬凑**
- **不要**在提示词正文里出现 `###` 符号（会被当成结束标记截断）

## 二、写法：Danbooru 标签流，不是句子

NovelAI 认的是**逗号分隔的标签**，不认完整英文句子。整段提示词就是标签的堆叠：

**禁止**写 `a beautiful woman is sitting by the window` 这类完整句，
**要**写成 `1girl, sitting, window` 这样的标签。

## 三、标签顺序（按这个顺序堆）

1. **主体**：人数 + 性别打头 —— `1girl` / `1boy` / `2girls` / `1girl, 1boy`
2. **外貌**：`long hair`、`black hair`、`blue eyes`、`medium breasts`（外貌取 `/个人信息/外貌`）
3. **服装**：`white shirt`、`black skirt`（穿着取 `/个人信息/当前穿着`）
4. **动作表情**：`smile`、`looking at viewer`、`sitting`、`arms crossed`
5. **场景**：`bedroom`、`night`、`window light`

**必须包含**

- 人数与性别（第一条标签，不能省）
- 人物外貌与当前穿着（取 `/个人信息/外貌`、`/个人信息/当前穿着`）
- 若世界背景指定了某部作品：标签中必须写明作品名
- 若角色来自某部作品：标签中必须写明角色名与出处
- 场景为 NSFW 时：描写性器，并在末尾追加 `nsfw, explicit`

**主要聚焦人物表情与姿势。**

## 四、禁止写（由程序统一拼接）

画风、渲染方式、质量词、分辨率、模型名 —— 包括但不限于
`masterpiece` / `best quality` / `very aesthetic` / `8k` / `absurdres` / `photorealistic` / `anime style`。
这些由程序按「画风预置」拼在最前面，写了也会被覆盖，纯属浪费。

## 五、思考草稿（可选）

写标签前可以用 `<imgthink>...</imgthink>` 打草稿。该块**不会显示给用户**，只用于理清画面：

<imgthink>
regex:: [引用正文里的关键描述]
语境参考: [结合 <历史前文>]
核心目的: [情绪/剧情/场景]
画面类型: [特写/半身/全身/双人/三人/互动]
</imgthink>

## 六、示例

**单人**

image### 1girl, long black hair, blue eyes, medium breasts, white shirt, black skirt, sitting, smile, looking at viewer, bedroom, night, window light ###

**双人**

image### 2girls, one with long black hair and one with short brown hair, red dress and blue jeans, standing, facing each other, laughing, street, dusk ###

**POV + 男性互动**

image### 1girl, 1boy, pov, long black hair, blue eyes, unbuttoned white shirt, lying on bed, blush, parted lips, looking at viewer, male hand on waist, bedroom, dim light ###

**NSFW**

image### 1girl, long black hair, blue eyes, large breasts, completely nude, spread legs, blush, sweat, looking at viewer, bedroom, night, nsfw, explicit ###

</texttoimage>
// 本段为 NovelAI 兼容接口专用。换回本地 ComfyUI 时程序会自动切到自然语言那条规则，无需手动改。
