// 引入必要的模块
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// 配置路径
const BASE_PATH = '';
const JS_FILE = 'links.js';

// 全局操作统计，用于生成增强的 Git 提交描述
let sessionStats = { added: 0, deleted: 0 };

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

/**
 * 读取链接数据
 */
function readLinkData() {
  const jsFilePath = path.join(BASE_PATH, JS_FILE);
  try {
    if (!fs.existsSync(jsFilePath)) {
      console.log(`\n❌ 找不到文件: ${jsFilePath}`);
      return null;
    }
    const content = fs.readFileSync(jsFilePath, 'utf8');
    const pattern = /const linkData = (\[[\s\S]*?\]);/;
    const match = content.match(pattern);
    if (!match) throw new Error('无法找到 linkData 数组');
    
    const linkData = eval(`(${match[1]})`); //
    return {
      linkData,
      content,
      matchStart: match.index + match[0].indexOf('['),
      matchEnd: match.index + match[0].lastIndexOf(']') + 1,
      jsFilePath
    };
  } catch (error) {
    console.error('\n❌ 读取失败:', error.message);
    return null;
  }
}

/**
 * 格式化显示链接
 */
function displayAllLinks(linkData) {
  console.log('\n' + '━'.repeat(50));
  console.log('📂 当前链接库状态:');
  linkData.forEach((category, index) => {
    const linkNames = category.links.map((link, linkIndex) => 
      `\x1b[36m${linkIndex + 1}\x1b[0m.${link.name}`
    );
    console.log(`\x1b[33m${index + 1}\x1b[0m. ${category.title} [\x1b[32m${linkNames.length}\x1b[0m]`);
    if (linkNames.length > 0) console.log(`   ${linkNames.join(', ')}`);
  });
  console.log('━'.repeat(50));
}

function objectToJsString(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/"([^"]+)":/g, '$1:') 
    .replace(/'/g, "\\'")         
    .replace(/"/g, "'");          
}

/**
 * 保存更改
 */
function saveChanges(linkData, fileInfo) {
  try {
    const jsLinkData = objectToJsString(linkData);
    const newContent = fileInfo.content.substring(0, fileInfo.matchStart) + jsLinkData + fileInfo.content.substring(fileInfo.matchEnd);
    fs.writeFileSync(fileInfo.jsFilePath + '.backup', fileInfo.content, 'utf8');
    fs.writeFileSync(fileInfo.jsFilePath, newContent, 'utf8');
    console.log('\x1b[32m✔ 修改已保存并同步\x1b[0m');
    return true;
  } catch (error) {
    console.error('\x1b[31m✘ 写入失败:\x1b[0m', error.message);
    return false;
  }
}

/**
 * 极简添加链接：1[分类] [名称] [URL] & [名称] [URL]
 */
function addLinks(input, fileInfo) {
  const data = input.substring(1).trim();
  if (!data) return console.log('\n💡 格式: 1分类号 名称 URL 名称 URL & 分类号 名称 URL');

  const segments = data.split('&');
  let currentAdded = 0;

  segments.forEach(segment => {
    const parts = segment.trim().split(/\s+/);
    const categoryNum = parseInt(parts[0]);

    if (isNaN(categoryNum) || categoryNum < 1 || categoryNum > fileInfo.linkData.length) {
      return console.log(`\n❌ 无效分类: ${parts[0]}`);
    }

    const category = fileInfo.linkData[categoryNum - 1];
    const items = parts.slice(1);

    for (let i = 0; i < items.length - 1; i += 2) {
      const name = items[i];
      let url = items[i + 1];
      if (!url.startsWith('http')) url = 'https://' + url;
      category.links.push({ name, url });
      console.log(`  + [${category.title}] 已添加: ${name}`);
      currentAdded++;
      sessionStats.added++; // 记录到全局统计
    }
  });

  if (currentAdded > 0) saveChanges(fileInfo.linkData, fileInfo);
}

/**
 * 极简删除链接：3[分类] [编号1] [编号2] & [分类] [编号]
 */
function deleteLink(input, fileInfo) {
  const data = input.substring(1).trim();
  if (!data) return console.log('\n💡 格式: 3分类号 编号1 编号2 & 分类号 编号');

  const segments = data.split('&');
  let currentDeleted = 0;

  segments.forEach(segment => {
    const parts = segment.trim().split(/\s+/);
    const categoryNum = parseInt(parts[0]);

    if (isNaN(categoryNum) || categoryNum < 1 || categoryNum > fileInfo.linkData.length) {
      return console.log(`\n❌ 无效分类: ${parts[0]}`);
    }

    const category = fileInfo.linkData[categoryNum - 1];
    const linkNums = parts.slice(1)
      .map(n => parseInt(n))
      .filter(n => !isNaN(n) && n >= 1 && n <= category.links.length)
      .sort((a, b) => b - a); // 倒序删除防止索引错乱

    linkNums.forEach(num => {
      const link = category.links.splice(num - 1, 1)[0];
      console.log(`  - [${category.title}] 已删除: ${link.name}`);
      currentDeleted++;
      sessionStats.deleted++; // 记录到全局统计
    });
  });

  if (currentDeleted > 0) saveChanges(fileInfo.linkData, fileInfo);
}

/**
 * 增强型 Git 提交逻辑
 */
function commitAllChangesToGitHub(commitMessage) {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (!status.trim()) return;

    console.log(`\n🚀 Git 提交中: ${commitMessage}`);
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('\x1b[32m✔ 更改已同步至 GitHub\x1b[0m');
  } catch (e) {
    console.error('\x1b[31m✘ Git 同步失败\x1b[0m');
  }
}

/**
 * 自动生成动态描述并提交
 */
function autoCommit(isManual = false) {
  let details = [];
  if (sessionStats.added > 0) details.push(`新增 ${sessionStats.added} 个链接`);
  if (sessionStats.deleted > 0) details.push(`删除 ${sessionStats.deleted} 个链接`);
  
  const prefix = isManual ? '手动提交' : '自动提交';
  const msg = details.length > 0 ? `${prefix}: ${details.join(', ')}` : `${prefix}: 链接库数据微调`;
  
  commitAllChangesToGitHub(msg);
}

function showMenu() {
  console.log('\n指令: \x1b[1m1\x1b[0m添加 | \x1b[1m3\x1b[0m删除 | \x1b[1m2\x1b[0m重载 | \x1b[1m4\x1b[0m手动Git | \x1b[1m回车\x1b[0m退出并自动提交');
}

async function mainMenu() {
  console.log('\n🚀 链接数据管理器 (增强 Git 描述版)');
  while (true) {
    const fileInfo = readLinkData();
    if (!fileInfo) break;
    displayAllLinks(fileInfo.linkData);
    showMenu();
    
    const input = await askQuestion('\n🎯 指令 > ');
    const cleanInput = input.trim();
    
    if (!cleanInput) {
      console.log('👋 退出并尝试同步...');
      autoCommit(false); // 退出时自动提交并显示统计内容
      rl.close();
      return;
    }

    const cmd = cleanInput[0];
    if (cmd === '1') addLinks(cleanInput, fileInfo);
    else if (cmd === '2') console.log('\x1b[34m🔄 数据已刷新\x1b[0m');
    else if (cmd === '3') deleteLink(cleanInput, fileInfo);
    else if (cmd === '4') autoCommit(true);
    else console.log('\n❌ 无效指令');
  }
}

mainMenu().catch(console.error);