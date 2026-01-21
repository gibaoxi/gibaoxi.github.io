// 引入必要的模块
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// 配置路径和文件名
const BASE_PATH = "/storage/emulated/0/git/web/";
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
      console.log(`\n❌❌ 找不到文件: ${jsFilePath}`);
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
    console.error('\n❌❌ 读取失败:', error.message);
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
    console.error('\x1b[31m✘✘ 写入失败:\x1b[0m', error.message);
    return false;
  }
}

// 添加链接的函数
function addLinks(input, fileInfo) {
  const data = input.substring(1).trim();
  if (!data) {
    console.log('\n💡💡 [添加] 格式: 1分类号 名称 URL 名称 URL & 分类号 名称 URL');
    return;
  }

  const segments = data.split('&');
  let addedCount = 0;
  const maxCat = fileInfo.linkData.length;

  segments.forEach(segment => {
    const parts = segment.trim().split(/\s+/);
    const categoryNum = parseInt(parts[0]);

    if (isNaN(categoryNum) || categoryNum < 1 || categoryNum > maxCat) {
      console.log(`\n❌❌ 跳过: 分类 "${parts[0]}" 不存在 (可用: 1-${maxCat})`);
      return;
    }

    const category = fileInfo.linkData[categoryNum - 1];
    const items = parts.slice(1);

    if (items.length < 2) {
      console.log(`\n❌❌ 跳过分类 ${categoryNum}: 缺少名称或 URL`);
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
    console.log('\n💡💡 [删除] 格式: 3分类号 编号1 编号2 & 分类号 编号');
    return;
  }

  const segments = data.split('&');
  let totalDeleted = 0;
  const maxCat = fileInfo.linkData.length;

  segments.forEach(segment => {
    const parts = segment.trim().split(/\s+/);
    const categoryNum = parseInt(parts[0]);

    if (isNaN(categoryNum) || categoryNum < 1 || categoryNum > maxCat) {
      console.log(`\n❌❌ 跳过: 分类 "${parts[0]}" 不存在 (可用: 1-${maxCat})`);
      return;
    }

    const category = fileInfo.linkData[categoryNum - 1];
    const linkNums = parts.slice(1)
      .map(n => parseInt(n))
      .filter(n => !isNaN(n) && n >= 1 && n <= category.links.length)
      .sort((a, b) => b - a);

    if (linkNums.length === 0 && parts.length > 1) {
      console.log(`\n❌❌ 分类 ${categoryNum} 中找不到指定的链接编号`);
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

// 检查是否有 Git 更改的函数
function hasGitChanges() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().length > 0;
  } catch (error) {
    return false;
  }
}

// 获取 Git 更改详情的函数
function getGitChanges() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (!status.trim()) return '无更改';
    
    const changes = status.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const statusCode = line.substring(0, 2).trim();
        const file = line.substring(3);
        let statusText = '';
        
        switch (statusCode) {
          case 'M': statusText = '修改'; break;
          case 'A': statusText = '新增'; break;
          case 'D': statusText = '删除'; break;
          case '??': statusText = '未跟踪'; break;
          default: statusText = `未知(${statusCode})`;
        }
        
        return `${statusText}: ${file}`;
      })
      .join('\n   ');
    
    return changes;
  } catch (error) {
    return '无法获取更改详情';
  }
}

// 提交所有 Git 更改到 GitHub 仓库的函数
function commitAllChangesToGitHub(commitMessage) {
  try {
    // 检查当前目录是否是 Git 仓库
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    } catch (error) {
      console.log('\n❌❌ 当前目录不是 Git 仓库，跳过 GitHub 提交');
      return false;
    }

    // 检查是否有更改
    if (!hasGitChanges()) {
      console.log('\n📝 没有检测到 Git 更改，跳过提交');
      return true;
    }

    console.log('\n📊 检测到以下 Git 更改:');
    console.log('   ' + getGitChanges().replace(/\n/g, '\n   '));
    console.log(`\n🚀 自动提交到 GitHub: ${commitMessage}`);

    // 添加所有文件到暂存区
    execSync('git add .', { stdio: 'inherit' });
    
    // 提交更改
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    // 推送到远程仓库
    execSync('git push', { stdio: 'inherit' });
    
    console.log('\x1b[32m✔ 所有更改已提交到 GitHub 仓库\x1b[0m');
    return true;
  } catch (error) {
    console.error('\x1b[31m✘✘ GitHub 提交失败:\x1b[0m', error.message);
    console.log('💡 请确保:');
    console.log('   - 当前目录是 Git 仓库');
    console.log('   - 已配置远程仓库地址');
    console.log('   - 有推送权限');
    return false;
  }
}

// 手动提交所有更改
function manualCommit() {
  commitAllChangesToGitHub('手动提交: 链接管理器更改');
}

// 在退出时自动提交所有更改到 GitHub
function commitOnExit() {
  try {
    // 检查是否是 Git 仓库
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    } catch (error) {
      console.log('\n❌❌ 当前目录不是 Git 仓库，跳过 GitHub 提交');
      return;
    }

    // 检查是否有更改
    if (!hasGitChanges()) {
      console.log('\n📝 没有检测到 Git 更改，无需提交');
      return;
    }

    // 自动提交，不询问
    commitAllChangesToGitHub('自动提交: 链接管理器退出时的更改');
  } catch (error) {
    console.error('\n❌❌ GitHub 提交过程中出错:', error.message);
  }
}

// 显示操作菜单
function showMenu() {
  console.log('\n操作指南:');
  console.log('\x1b[1m 1 \x1b[0m添加: \x1b[90m1[分类] [名] [URL] & [分类] [名] [URL]\x1b[0m');
  console.log('\x1b[1m 3 \x1b[0m删除: \x1b[90m3[分类] [编号] [编号] & [分类] [编号]\x1b[0m');
  console.log('\x1b[1m 2 \x1b[0m重载 | \x1b[1m4\x1b[0m手动提交 | \x1b[1m回车\x1b[0m退出并自动提交');
}

// 主菜单函数
async function mainMenu() {
  console.log('\n🚀🚀 链接数据管理器');
  
  while (true) {
    const fileInfo = readLinkData();
    if (!fileInfo) break;
    
    displayAllLinks(fileInfo.linkData);
    showMenu();
    
    const input = await askQuestion('\n🎯🎯 指令 > ');
    const cleanInput = input.trim();
    
    if (!cleanInput) {
      console.log('👋👋 程序已退出');
      rl.close();

      // 只在退出时提交所有更改
      commitOnExit();
      return;
    }

    const cmd = cleanInput[0];
    if (cmd === '1') addLinks(cleanInput, fileInfo);
    else if (cmd === '2') console.log('\x1b[34m🔄🔄 数据已刷新\x1b[0m');
    else if (cmd === '3') deleteLink(cleanInput, fileInfo);
    else if (cmd === '4') manualCommit();
    else console.log('\n❌❌ 无效指令，请按 1, 2, 3, 4 或回车退出');
  }
}

// 启动主菜单
mainMenu().catch(console.error);
