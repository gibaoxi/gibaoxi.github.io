// 引入必要的模块
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');

// 配置路径和文件名
const BASE_PATH = '';
const JS_FILE = 'links.js';
const CONFIG_FILE = 'config.json';

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 询问问题的辅助函数
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// 读取链接数据的函数
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
    if (!match) throw new Error('无法在文件中找到 linkData 数组');
    
    // 使用 eval 解析 linkData（确保内容安全）
    const linkData = eval(`(${match[1]})`);
    
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

// 显示所有链接的函数
function displayAllLinks(linkData) {
  console.log('\n' + '─'.repeat(50));
  console.log('当前链接库:');
  linkData.forEach((category, index) => {
    const linkNames = category.links.map((link, linkIndex) => 
      `\x1b[36m${linkIndex + 1}\x1b[0m.${link.name}`
    );
    console.log(`\x1b[33m${index + 1}\x1b[0m. ${category.title} [${linkNames.length}]`);
    if (linkNames.length > 0) console.log(`   ${linkNames.join(', ')}`);
  });
  console.log('─'.repeat(50));
}

// 将对象转换为格式化的 JavaScript 字符串
function objectToJsString(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/"([^"]+)":/g, '$1:') // 将 "key": 替换为 key:
    .replace(/'/g, "\\'")          // 转义单引号
    .replace(/"/g, "'");           // 将双引号替换为单引号
}

// 保存更改到文件的函数
function saveChanges(linkData, fileInfo) {
  try {
    const jsLinkData = objectToJsString(linkData);
    const newContent = fileInfo.content.substring(0, fileInfo.matchStart) + jsLinkData + fileInfo.content.substring(fileInfo.matchEnd);
    fs.writeFileSync(fileInfo.jsFilePath + '.backup', fileInfo.content, 'utf8');
    fs.writeFileSync(fileInfo.jsFilePath, newContent, 'utf8');
    console.log('\x1b[32m✔ 修改已同步至文件并创建备份\x1b[0m');
    return true;
  } catch (error) {
    console.error('\x1b[31m✘ 写入失败:\x1b[0m', error.message);
    return false;
  }
}

// 添加链接的函数
function addLinks(input, fileInfo) {
  const data = input.substring(1).trim();
  if (!data) {
    console.log('\n💡 [添加] 格式: 1分类号 名称 URL 名称 URL & 分类号 名称 URL');
    return;
  }

  const segments = data.split('&');
  let addedCount = 0;
  const maxCat = fileInfo.linkData.length;

  segments.forEach(segment => {
    const parts = segment.trim().split(/\s+/);
    const categoryNum = parseInt(parts[0]);

    if (isNaN(categoryNum) || categoryNum < 1 || categoryNum > maxCat) {
      console.log(`\n❌ 跳过: 分类 "${parts[0]}" 不存在 (可用: 1-${maxCat})`);
      return;
    }

    const category = fileInfo.linkData[categoryNum - 1];
    const items = parts.slice(1);

    if (items.length < 2) {
      console.log(`\n❌ 跳过分类 ${categoryNum}: 缺少名称或 URL`);
      return;
    }
    if (items.length % 2 !== 0) {
      console.log(`\n⚠️ 警告: 分类 ${categoryNum} 的参数不是成对的，最后一个项已被忽略`);
    }

    for (let i = 0; i < items.length - 1; i += 2) {
      const name = items[i];
      let url = items[i + 1];
      if (!url.startsWith('http')) url = 'https://' + url;
      category.links.push({ name, url });
      console.log(`  + [${category.title}] 已添加: ${name}`);
      addedCount++;
    }
  });

  if (addedCount > 0) saveChanges(fileInfo.linkData, fileInfo);
}

// 删除链接的函数
function deleteLink(input, fileInfo) {
  const data = input.substring(1).trim();
  if (!data) {
    console.log('\n💡 [删除] 格式: 3分类号 编号1 编号2 & 分类号 编号');
    return;
  }

  const segments = data.split('&');
  let totalDeleted = 0;
  const maxCat = fileInfo.linkData.length;

  segments.forEach(segment => {
    const parts = segment.trim().split(/\s+/);
    const categoryNum = parseInt(parts[0]);

    if (isNaN(categoryNum) || categoryNum < 1 || categoryNum > maxCat) {
      console.log(`\n❌ 跳过: 分类 "${parts[0]}" 不存在 (可用: 1-${maxCat})`);
      return;
    }

    const category = fileInfo.linkData[categoryNum - 1];
    const linkNums = parts.slice(1)
      .map(n => parseInt(n))
      .filter(n => !isNaN(n) && n >= 1 && n <= category.links.length)
      .sort((a, b) => b - a);

    if (linkNums.length === 0 && parts.length > 1) {
      console.log(`\n❌ 分类 ${categoryNum} 中找不到指定的链接编号`);
      return;
    }

    linkNums.forEach(num => {
      const link = category.links.splice(num - 1, 1)[0];
      console.log(`  - [${category.title}] 已删除: ${link.name}`);
      totalDeleted++;
    });
  });

  if (totalDeleted > 0) saveChanges(fileInfo.linkData, fileInfo);
}

// 上传 links.js 到 GitHub Gist 的函数（修复版）
async function uploadToGist(jsFilePath, token, gistId) {
  try {
    const fileContent = fs.readFileSync(jsFilePath, 'utf8');

    // 获取当前 Gist 的内容
    const getResponse = await axios.get(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // 构建要更新的文件对象
    const files = {};
    
    // 保留其他文件 - 正确遍历对象
    for (const [filename, fileData] of Object.entries(getResponse.data.files)) {
      if (filename === 'links.js') {
        // 更新 links.js
        files[filename] = { content: fileContent };
      } else {
        // 保留其他文件
        files[filename] = { content: fileData.content };
      }
    }

    // 如果 Gist 中没有 links.js，添加它
    if (!getResponse.data.files['links.js']) {
      files['links.js'] = { content: fileContent };
    }

    // 更新 Gist
    const patchResponse = await axios.patch(`https://api.github.com/gists/${gistId}`, {
      files
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
    });

    console.log('\x1b[32m✔ links.js 已成功上传到 GitHub Gist 并保留其他文件\x1b[0m');
  } catch (error) {
    console.error('\x1b[31m✘ 上传到 Gist 失败:\x1b[0m', error.response ? error.response.data : error.message);
  }
}

// 在退出前上传 links.js 到 Gist 的函数
async function uploadToGistBeforeExit() {
  try {
    const configPath = path.join(BASE_PATH, CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      console.log('\n❌ 找不到配置文件: config.json');
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.web?.token;
    const gistId = config.web?.gid;

    if (!token || !gistId) {
      console.log('\n❌ 配置文件中缺少 token 或 gistId');
      return;
    }

    const jsFilePath = path.join(BASE_PATH, JS_FILE);
    if (!fs.existsSync(jsFilePath)) {
      console.log('\n❌ 找不到文件: links.js');
      return;
    }

    await uploadToGist(jsFilePath, token, gistId);
  } catch (error) {
    console.error('\n❌ 上传配置读取或上传过程中出错:', error.message);
  }
}

// 显示操作菜单
function showMenu() {
  console.log('\n操作指南:');
  console.log('\x1b[1m 1 \x1b[0m添加: \x1b[90m1[分类] [名] [URL] & [分类] [名] [URL]\x1b[0m');
  console.log('\x1b[1m 3 \x1b[0m删除: \x1b[90m3[分类] [编号] [编号] & [分类] [编号]\x1b[0m');
  console.log('\x1b[1m 2 \x1b[0m重载 | \x1b[1m回车\x1b[0m退出');
}

// 主菜单函数
async function mainMenu() {
  console.log('\n🚀 链接数据管理器');
  
  while (true) {
    const fileInfo = readLinkData();
    if (!fileInfo) break;
    
    displayAllLinks(fileInfo.linkData);
    showMenu();
    
    const input = await askQuestion('\n🎯 指令 > ');
    const cleanInput = input.trim();
    
    if (!cleanInput) {
      console.log('👋 程序已退出');
      rl.close();

      // 在退出前上传 links.js 到 Gist
      await uploadToGistBeforeExit();
      return;
    }

    const cmd = cleanInput[0];
    if (cmd === '1') addLinks(cleanInput, fileInfo);
    else if (cmd === '2') console.log('\x1b[34m🔄 数据已刷新\x1b[0m');
    else if (cmd === '3') deleteLink(cleanInput, fileInfo);
    else console.log('\n❌ 无效指令，请按 1, 2 或 3');
  }
}

// 启动主菜单
mainMenu().catch(console.error);
