// 链接数据 - 按照你的分类整理
const linkData = [
  {title:'国内',
    
    links: [
      { name: "遥控器", url: "http://192.168.0.104:9978/" },
      { name: "测速", url: "https://www.speedtest.net/" },
      { name: "通义千问", url: "https://tongyi.aliyun.com/qianwen/?spm=5176.28326591.0.0.40f76ee154Xx7L" },
      { name: "csdn", url: "https://www.csdn.net/" },
      { name: "gitee", url: "https://gitee.com/" },
      { name: "QQ邮箱", url: "https://mail.qq.com/" },
      { name: "微博", url: "https://weibo.com/" },
      { name: "IP", url: "https://ip.sb/" },
      { name: "ping", url: "https://www.itdog.cn/ping/" },
      { name: "DNS", url: "https://ipchaxun.com/" },
      { name: "文心一言", url: "https://yiyan.baidu.com/" },
      { name: "搜图神器", url: "http://www.soutushenqi.com/home" },
      { name: "哔哩哔哩", url: "https://www.bilibili.com/" },
      { name: "虎牙", url: "https://www.huya.com/" },
      { name: "DS", url: "https://chat.deepseek.com/" },
      { name: "王者荣耀", url: "https://pvp.qq.com/" },
      { name: "东坡下载", url: "http://www.uzzf.com/" },
      { name: "百度网盘", url: "https://pan.baidu.com/disk/main?from=oldversion" },
      { name: "蓝奏云", url: "https://up.woozooo.com/" },
      { name: "坚果云", url: "https://www.jianguoyun.com/" },
      { name: "油猴", url: "https://www.tampermonkey.net/scripts.php#gf" },
      { name: "哪吒", url: "http://130.61.108.67.nip.io:29846/" },
      { name: "xui", url: "http://[2607:5300:203:220c:b6cd:af41:20dc:4757]:252/xui/inbounds" },
      { name: "alist", url: "http://130.61.108.67:43610" },
      { name: "迅雷云", url: "https://pan.xunlei.com/?path=%2F" }
    ]
  },
  {
    title: "国外",
    links: [
      {name:"claw",url:"https://ap-southeast-1.run.claw.cloud/signin"},
{name:"digital",url:"https://dash.domain.digitalplat.org/auth/login"},
      { name: "groq", url: "https://groq.com/" },
      { name: "huggingface", url: "https://huggingface.co/chat/conversation/65d998e91f26106dad5ee807" },
      { name: "Zlib", url: "https://z-lib.hk/s/?languages%5B%5D=chinese&extensions%5B%5D=EPUB" },
      { name: "gemini", url: "https://gemini-pro-chat-theta-steel-22.vercel.app/" },
      { name: "谷歌", url: "https://www.google.hk/" },
      { name: "github", url: "https://github.com/" },
      { name: "小黄云", url: "https://dash.cloudflare.com/" },
      { name: "油管", url: "https://www.youtube.com/" },
      { name: "cloudns", url: "https://www.cloudns.net/main/" },
      { name: "desec", url: "https://desec.io/domains" },
      { name: "Pixiv", url: "https://www.pixiv.net/discovery" },
      { name: "OpenAI", url: "https://chat.openai.com/#" },
      { name: "glitch", url: "https://glitch.com/dashboard" },
      { name: "codesand", url: "https://codesandbox.io/dashboard" },
      { name: "back4", url: "https://containers.back4app.com/apps" },
      { name: "zea", url: "https://dash.zeabur.com/projects" },
      { name: "koyeb", url: "https://app.koyeb.com/apps/f4c6ef50-634f-460f-805b-69d585079dbc/services/1b667435-a8fd-4d1d-aa7e-612916930274" },
      { name: "render", url: "https://dashboard.render.com/" },
      { name: "编程", url: "https://www.runoob.com/w3cnote/python-pip-install-usage.html" },
      { name: "deno", url: "https://dash.deno.com/projects" },
      { name: "replit", url: "https://replit.com/~" },
      { name: "cyclic", url: "https://app.cyclic.sh/#/" },
      { name: "webapp", url: "https://webapp.io/gibaoxi" },
      { name: "discord", url: "https://discord.com/" },
      { name: "gmail", url: "https://mail.google.com/mail/mu/mp/755/#tl/priority/%5Esmartlabel_personal" },
      { name: "DCI", url: "https://cloud.duckyci.com/compute/instances" },
      { name: "serv00", url: "https://www.serv00.com/offer/create_new_account" },
      { name: "X10", url: "https://x10hosting.com/panel/services/149583" },
      { name: "FTP", url: "https://ftp.hax.co.id/" },
      { name: "ssh", url: "https://web-v4rl.onrender.com/" },
      { name: "Twitter", url: "https://www.twitter.com/" },
      { name: "instagram", url: "https://www.instagram.com" },
      { name: "Facebook", url: "https://www.facebook.com/" }
    ]
  },
  {
    title: "工具",
    links: [
      { name: "图片转文字", url: "https://ocr.wdku.net/" },
      { name: "课本", url: "http://zj.xdf.cn/kecheng/202002/248571701.html" },
      { name: "二维码", url: "" },
      { name: "ai图", url: "https://pixai.art/" },
      { name: "alist", url: "http://ali.gibaoxi.cloudns.biz/" },
      { name: "百度加速", url: "http://94speed.com/" },
      { name: "订阅转换", url: "https://suburl.v1.mk/" },
      { name: "搜学吧", url: "http://www.souxue8.com/" },
      { name: "音乐磁场", url: "https://hifini.com/" },
      { name: "源仓库", url: "https://www.yckceo.com/" },
      { name: "文字替换", url: "https://www.md5.cn/tools/txtreplace/" },
      { name: "解密工具", url: "https://www.sojson.com/encrypt/" },
      { name: "扩展", url: "https://chromewebstore.google.com/search/VPN?hl=zh-CN&_category=extensions" },
      { name: "tvbox", url: "https://xn--sss604efuw.top/" },
      { name: "路由器", url: "http://192.168.0.1/" },
      { name: "光猫", url: "http://192.168.1.1/" },
      { name: "网易云", url: "https://music.163.com/#/user/level" }
    ]
  }
];

// 生成链接列表的函数
function generateLinkSections() {
  const mainContent = document.querySelector('.main-content');

  linkData.forEach(section => {
    // 如果有标题，添加标题
    if (section.title) {
      const title = document.createElement('h3');
      title.className = 'link-section-title';
      title.textContent = section.title;
      mainContent.appendChild(title);
    }

    // 创建链接部分容器
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'link-section';

    // 创建链接列表容器
    const linkList = document.createElement('div');
    linkList.className = 'link-list';

    // 添加每个链接
    section.links.forEach(link => {
      const linkDiv = document.createElement('div');
      linkDiv.className = 'link';

      const linkElement = document.createElement('a');
      linkElement.href = link.url;
      linkElement.textContent = link.name;
      linkElement.target = '_blank';

      linkDiv.appendChild(linkElement);
      linkList.appendChild(linkDiv);
    });

    sectionDiv.appendChild(linkList);
    mainContent.appendChild(sectionDiv);
  });

  // 添加页脚
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = '<span class="site-footer-credits"><a href="https://github.com/gibaoxi/gibaoxi.github.io">代码</a></span>';
  mainContent.appendChild(footer);
}

// 页面加载完成后生成链接
document.addEventListener('DOMContentLoaded', generateLinkSections);
