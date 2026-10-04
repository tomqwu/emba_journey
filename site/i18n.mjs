export const zh = {
  "Skip to content": "跳到正文",
  "A personal learning library": "个人学习知识库",
  "Main navigation": "主导航",
  Library: "知识库",
  "Capture guide": "收录指南",
  "Learn. Connect. Apply.": "学习 · 关联 · 应用",
  "Browse the Markdown source ↗": "浏览 Markdown 源文件 ↗",
  "Knowledge library": "学习知识库",
  "THE EXECUTIVE LEARNING NOTEBOOK": "EMBA 学习笔记",
  "Learn deeply.": "深入学习。",
  "Connect the ideas.": "建立知识关联。",
  "published notes": "篇已发布笔记",
  "subjects explored": "个已探索学科",
  "topic tags": "个主题标签",
  "Explore the library": "探索知识库",
  "Browse the library": "浏览知识库",
  "Browse subjects": "按学科浏览",
  "All subjects": "全部学科",
  "Explore topics": "探索主题",
  "A slide, a link, a question.": "一张幻灯片、一个链接、一个问题。",
  "Start with what you have.": "从手头的材料开始。",
  "How to capture learning →": "如何收录学习材料 →",
  "YOUR GROWING COLLECTION": "持续积累的知识",
  "All learning": "全部笔记",
  "Browse ideas across subjects. Follow a tag to find connections.":
    "跨学科浏览知识，通过标签发现关联。",
  "Search the library": "搜索知识库",
  "Search concepts, keywords, or courses…": "搜索概念、关键词或课程…",
  "Note type": "笔记类型",
  "All types": "全部类型",
  "Sort by": "排序方式",
  "Recently updated": "最近更新",
  "Title A–Z": "标题排序",
  "Search relevance": "搜索相关度",
  "Reset filters": "重置筛选",
  "Selected filters": "已选筛选条件",
  "No notes found here yet": "暂未找到匹配的笔记",
  "Try a broader search, reset the filters, or capture your next learning.":
    "试试更宽泛的关键词、重置筛选，或收录新的学习内容。",
  "Show all notes": "显示全部笔记",
  "Search and filters need JavaScript. All published notes are listed above.":
    "搜索和筛选需要 JavaScript。上方列出了全部已发布笔记。",
  "FROM INPUT TO INSIGHT": "从材料到洞见",
  "Every learning starts somewhere.": "每一次学习都有起点。",
  "Bring your slides, articles, and questions. Build a record you can return to.":
    "收录幻灯片、文章和问题，建立可随时回顾的学习记录。",
  "Open the capture guide →": "打开收录指南 →",
  Concept: "概念",
  Lecture: "课堂笔记",
  Article: "文章",
  "Case study": "案例分析",
  Reflection: "学习反思",
  Guide: "指南",
  Breadcrumb: "当前位置",
  "On this page": "本页目录",
  "Mobile table of contents": "移动端目录",
  "Table of contents": "正文目录",
  "TRACE THE IDEAS": "追溯知识来源",
  "Sources & further reading": "来源与延伸阅读",
  "KEEP EXPLORING": "继续探索",
  "Connected ideas": "关联笔记",
  "View Markdown ↗": "查看 Markdown ↗",
  "ON THIS PAGE": "本页目录",
  "Page not found": "页面未找到",
  "This note could not be found.": "无法找到这篇笔记。",
  "Return to the knowledge library": "返回学习知识库",
  "Connect source material to useful learning": "将原始材料转化为可用的知识",
  "Sources connect to ideas, which connect to practical applications.":
    "从来源提炼概念，再连接到实际应用。",
  Sources: "来源",
  Questions: "问题",
  Connections: "关联",
  Applications: "应用",
  Ideas: "概念",
  "Read &amp; capture": "阅读与收录",
  "Stay curious": "保持好奇",
  "Link concepts": "关联概念",
  "Put into practice": "付诸实践",
  Hofstede: "霍夫斯泰德",
  Culture: "文化",
  "Cross Cultural Management": "跨文化管理",
  Leadership: "领导力",
  "Global Business": "全球商业",
  "Organizational Culture": "组织文化",
  Teams: "团队",
  "Learning System": "学习体系",
  "Getting Started": "入门",
};
export function localizeHTML(html, locale) {
  if (locale !== "zh") return html;
  return html
    .replace(/>[^<]*</g, (segment) => {
      let text = segment.slice(1, -1);
      const trimmed = text.trim();
      if (zh[trimmed]) text = text.replace(trimmed, zh[trimmed]);
      else
        text = text
          .replace(/^Knowledge library ·/, "学习知识库 ·")
          .replace(/^Page not found ·/, "页面未找到 ·")
          .replace(/^Updated /, "更新于 ")
          .replace(/^Captured /, "收录于 ")
          .replace(/(\d+) min read/g, "$1 分钟阅读")
          .replace(/(\d+) (?:notes|note)$/, "$1 篇笔记")
          .replace(/^(\d+) more tags$/, "另有 $1 个标签")
          .replace(/^← Back to /, "← 返回 ");
      return ">" + text + "<";
    })
    .replace(
      /(aria-label|placeholder)="([^"]+)"/g,
      (_, attr, text) =>
        `${attr}="${zh[text] || text.replace(/(\d+) more tags/, "另有 $1 个标签")}"`,
    );
}
export const ui = (locale, key) => (locale === "zh" ? zh[key] || key : key);
export const resultText = (locale, count, search) =>
  locale === "zh"
    ? `${count} 篇笔记${search ? "符合搜索条件" : ""}`
    : `${count} ${count === 1 ? "note" : "notes"}${search ? " matching your search" : ""}`;
