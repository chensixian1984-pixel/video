/* 免费影音库 — 纯静态前端：拉取 data/channels.json 与 data/vod.json 渲染海报墙 */
(function () {
  "use strict";

  var CATS = [
    ["all", "全部"],
    ["domestic", "国内直播"],
    ["global", "全球直播"],
    ["movie", "电影"],
    ["kids", "少儿动画"],
    ["gala", "晚会点播"],
    ["other", "其他点播"],
  ];
  var KIND2CAT = { "电影": "movie", "少儿": "kids", "晚会": "gala", "其他": "other" };
  var COUNTRY_NAMES = {
    US: "美国", GB: "英国", JP: "日本", KR: "韩国", FR: "法国", DE: "德国",
    RU: "俄罗斯", IN: "印度", QA: "卡塔尔", SG: "新加坡", AU: "澳大利亚",
    IT: "意大利", PL: "波兰", CZ: "捷克", UA: "乌克兰", SE: "瑞典",
    HU: "匈牙利", IE: "爱尔兰", TR: "土耳其", AT: "奥地利", PK: "巴基斯坦",
    CN: "中国",
  };

  var items = [];
  var state = { cat: "all", country: "all", group: "all", q: "" };
  var current = null;
  var hls = null;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function loadData() {
    return Promise.all([
      fetch("data/channels.json").then(function (r) { return r.json(); }),
      fetch("data/vod.json").then(function (r) { return r.json(); }),
    ]).then(function (res) {
      var live = res[0], vod = res[1];
      items = live.map(function (c) {
        return {
          name: c.name, logo: c.logo, group: c.group, country: c.country || "",
          url: c.url, source: c.source, cat: c.cat, isVod: false,
        };
      }).concat(vod.map(function (v) {
        return {
          name: v.name, logo: v.logo, group: v.kind, country: "CN",
          url: v.url, source: "iptv4", cat: KIND2CAT[v.kind] || "other", isVod: true,
        };
      }));
    });
  }

  function buildChips() {
    var wrap = $("chips");
    wrap.innerHTML = "";
    CATS.forEach(function (pair) {
      var key = pair[0], label = pair[1];
      var count = key === "all" ? items.length : items.filter(function (i) { return i.cat === key; }).length;
      if (count === 0) return;
      var b = el("button", "chip" + (state.cat === key ? " active" : ""), label + " " + count);
      b.type = "button";
      b.addEventListener("click", function () {
        state.cat = key;
        if (key !== "all" && key !== "global") state.country = "all";
        if (key !== "all" && key !== "domestic") state.group = "all";
        buildChips();
        buildFilters();
        render();
      });
      wrap.appendChild(b);
    });
  }

  function buildFilters() {
    var showCountry = state.cat === "all" || state.cat === "global";
    var showGroup = state.cat === "all" || state.cat === "domestic";
    $("countryWrap").hidden = !showCountry;
    $("groupWrap").hidden = !showGroup;

    if (showCountry) {
      var counts = {};
      items.forEach(function (i) {
        if (i.cat === "global" && i.country) counts[i.country] = (counts[i.country] || 0) + 1;
      });
      var sel = $("countrySel");
      var prev = state.country;
      sel.innerHTML = "";
      sel.appendChild(new Option("全部国家", "all"));
      Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).forEach(function (code) {
        var label = (COUNTRY_NAMES[code] || code) + " " + counts[code];
        sel.appendChild(new Option(label, code));
      });
      sel.value = prev in counts || prev === "all" ? prev : "all";
      state.country = sel.value;
    }

    if (showGroup) {
      var gcounts = {};
      items.forEach(function (i) {
        if (i.cat === "domestic") gcounts[i.group] = (gcounts[i.group] || 0) + 1;
      });
      var gsel = $("groupSel");
      var gprev = state.group;
      gsel.innerHTML = "";
      gsel.appendChild(new Option("全部分组", "all"));
      Object.keys(gcounts).sort(function (a, b) { return gcounts[b] - gcounts[a]; }).forEach(function (g) {
        gsel.appendChild(new Option(g + " " + gcounts[g], g));
      });
      gsel.value = gprev in gcounts || gprev === "all" ? gprev : "all";
      state.group = gsel.value;
    }
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return items.filter(function (i) {
      if (state.cat !== "all" && i.cat !== state.cat) return false;
      if ((state.cat === "all" || state.cat === "global") && state.country !== "all" && i.country !== state.country) return false;
      if ((state.cat === "all" || state.cat === "domestic") && state.group !== "all" && i.group !== state.group) return false;
      if (q && i.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function fallbackDiv(name) {
    return el("div", "poster-fallback", name);
  }

  function render() {
    var list = filtered();
    var grid = $("grid");
    grid.innerHTML = "";
    var liveTotal = items.filter(function (i) { return !i.isVod; }).length;
    var vodTotal = items.length - liveTotal;
    $("countLine").textContent = "共 " + liveTotal + " 个直播 · " + vodTotal + " 个点播 | 当前显示 " + list.length + " 个";
    if (!list.length) {
      grid.appendChild(el("p", "empty", "没有找到匹配的频道，换个关键词或分类试试。"));
      return;
    }
    list.forEach(function (item) {
      var card = el("button", "card");
      card.type = "button";
      var poster = el("div", "poster");
      poster.appendChild(fallbackDiv(item.name));
      if (item.logo) {
        var img = new Image();
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.alt = "";
        img.onerror = function () { img.remove(); };
        img.src = item.logo;
        poster.appendChild(img);
      }
      card.appendChild(poster);
      var body = el("div", "card-body");
      body.appendChild(el("div", "card-name", item.name));
      var meta = (item.group || "") + (item.source ? " · " + item.source : "");
      body.appendChild(el("div", "card-meta", meta));
      if (item.isVod) body.appendChild(el("span", "badge-vod", "点播 / 轮播"));
      card.appendChild(body);
      card.addEventListener("click", function () { play(item); });
      grid.appendChild(card);
    });
  }

  function showPlayError() {
    $("playError").hidden = false;
  }

  function play(item) {
    current = item;
    var video = $("video");
    $("player").hidden = false;
    $("playError").hidden = true;
    $("copyOk").hidden = true;
    $("nowName").textContent = item.name;
    $("nowMeta").textContent = (item.group || "") + (item.source ? " · 来源 " + item.source : "") + (item.isVod ? " · 点播 / 轮播" : " · 直播");
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    video.removeAttribute("src");
    video.load();
    var url = item.url;
    var isHls = /\.m3u8(\?|$)/i.test(url);
    if (isHls && window.Hls && window.Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
        video.play().catch(function () {});
      });
      hls.on(window.Hls.Events.ERROR, function (ev, data) {
        if (data && data.fatal) showPlayError();
      });
    } else {
      video.src = url;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    document.getElementById("player").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closePlayer() {
    var video = $("video");
    video.pause();
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    video.removeAttribute("src");
    video.load();
    $("player").hidden = true;
    current = null;
  }

  function copyUrl() {
    if (!current) return;
    var done = function () { $("copyOk").hidden = false; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(current.url).then(done, function () { fallbackCopy(); });
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      var ta = document.createElement("textarea");
      ta.value = current.url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function init() {
    $("search").addEventListener("input", function (e) {
      state.q = e.target.value;
      render();
    });
    $("countrySel").addEventListener("change", function (e) {
      state.country = e.target.value;
      render();
    });
    $("groupSel").addEventListener("change", function (e) {
      state.group = e.target.value;
      render();
    });
    $("closePlayer").addEventListener("click", closePlayer);
    $("copyUrl").addEventListener("click", copyUrl);
    $("video").addEventListener("error", showPlayError);

    loadData().then(function () {
      buildChips();
      buildFilters();
      render();
    }).catch(function () {
      $("countLine").textContent = "数据加载失败：请用 http(s) 方式打开本站（直接双击文件可能读不到 data 目录）。";
      $("grid").appendChild(el("p", "empty", "数据文件加载失败。"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
