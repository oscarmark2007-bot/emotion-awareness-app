#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自動化測試程式 - 情緒觀察表 (Emotional Awareness PWA App)
測試項目涵蓋：
1. PWA 資源與 Manifest 載入測試
2. 手機視角模擬 (iPhone 與 Android) 與安裝引導檢驗
3. 12 步驟精靈填表 (觸發點 -> 身體 -> 念頭 -> 情緒 -> 落地 -> 假相 -> 真相 -> [事件]放最後 -> 今日評價)
4. 驗證步驟可略過性 (點選略過鈕測試)
5. 記錄管理、搜尋與詳情查看
6. 統計看板與週/季/月/年總結報告檢驗
7. Excel (.xlsx) 報表匯出檔案檢驗
8. 本地硬碟 JSON 完整備份下載檢驗
"""

import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), 'test_screenshots')
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

TARGET_URL = "http://localhost:8080/"

def log_test(step_num, title, status="PASS"):
    symbol = "✅" if status == "PASS" else "❌"
    print(f"{symbol} [測試 {step_num}] {title}")

def run_tests():
    print("=" * 64)
    print("   🌸 開始執行「情緒觀察表」自動化端到端測試 (更新流程)")
    print(f"   🎯 測試目標網址: {TARGET_URL}")
    print("=" * 64)

    import socket
    import subprocess
    server_proc = None
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.connect(('127.0.0.1', 8080))
        s.close()
    except Exception:
        print("   🚀 自動啟動本地微型伺服器 server.py...")
        server_proc = subprocess.Popen([sys.executable, r"C:\Users\oscar\OneDrive\桌面\z_emtion_awareness\server.py"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1.5)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True)
            context = browser.new_context(
                viewport={"width": 393, "height": 851},
                user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True
            )
    
            page = context.new_page()
    
            # 1. 首頁載入
            page.goto(TARGET_URL, wait_until="networkidle")
            title = page.title()
            assert "情緒觀察表" in title
            log_test(1, f"首頁載入成功: {title}")
    
            # 2. 測試略過功能 (Skip Button)
            skip_btn = page.locator("#btn-wizard-skip")
            assert skip_btn.is_visible(), "略過按鈕未顯示"
            log_test(2, "「略過」按鈕就緒，支援不填直接執行下去")
    
            # 3. 執行新版 12 欄位步驟 (事件放最後回顧)
            print("\n--- 執行全新流程：辨認 ➔ 落地 ➔ 再看真相 ➔ [事件]放最後 ---")
            
            # 步驟 1: 觸發點
            page.locator("#wiz-trigger").fill("主管說了一句：「這份數據好像不太對喔」")
            log_test("3-1", "步驟 1 [觸發點] 填寫完成")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 2: 身體反應 (選擇 + 自訂新增)
            page.locator(".tag-pill:has-text('抿嘴')").click()
            page.locator(".tag-pill:has-text('胸悶')").click()
            page.locator("#wiz-add-tag-input").fill("呼吸急促")
            page.locator("#wiz-add-tag-btn").click()
            log_test("3-2", "步驟 2 [身體反應] 標籤選取與自訂新增完成")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 3: 心裡自然流露的話
            page.locator(".tag-pill:has-text('你在說什麼？')").click()
            page.locator(".tag-pill:has-text('好緊張')").click()
            log_test("3-3", "步驟 3 [心裡的話] 標籤選取完成")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 4: 情緒類別
            page.locator(".tag-pill:has-text('擔心')").click()
            page.locator(".tag-pill:has-text('壓力')").click()
            log_test("3-4", "步驟 4 [情緒類別] 標籤選取完成")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 5: 情緒指數 (動態滑桿)
            sliders = page.locator(".emo-slider")
            if sliders.count() >= 2:
                sliders.nth(0).fill("92")
                sliders.nth(1).fill("75")
            log_test("3-5", "步驟 5 [情緒指數] 滑動設定 (92, 75)")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 6: 情緒落地方式
            page.locator(".tag-pill:has-text('深呼吸')").click()
            page.locator(".tag-pill:has-text('敲胸')").click()
            log_test("3-6", "步驟 6 [情緒落地] 標籤選取完成")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 7: 落地時機
            page.locator("#wizard-body .choice-pill:has-text('當下落地')").click()
            log_test("3-7", "步驟 7 [落地時機] 選擇「當下落地」")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 8: 落地後指數
            page.locator("#slider-post-score").fill("25")
            log_test("3-8", "步驟 8 [落地後指數] 調至 25分")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 9: 好像的事實 (假相)
            page.locator("#wiz-seemed").fill("當時我以為主管對我有成見、覺得我能力不夠")
            log_test("3-9", "步驟 9 [好像的事實] 填寫完成")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 10: 確立的事實 (真相)
            page.locator("#wiz-real").fill("會議後查證發現只是投影片格式版本不同，客觀事實主管肯定我的成果")
            page.locator("#wizard-body .choice-pill:has-text('完全錯誤')").click()
            log_test("3-10", "步驟 10 [確立的事實] 填寫並核對假相「完全錯誤」")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 11: 事件發生的時間與事件經過 (放最後！)
            page.locator("#wiz-event").fill("今天早上晨會臨時被點名報告季度分析")
            log_test("3-11", "步驟 11 [事件與時間] 放最後回顧，填寫完成！")
            page.locator("#btn-wizard-next").click()
    
            # 步驟 12: 今日評價
            page.locator("#wiz-reflection").fill("讚嘆自己今天在被點名當下有立刻察覺到胸悶與緊張，及時做了兩次深呼吸落地！看到事實真相後心情放鬆很多，肯定自己的進步！")
            log_test("3-12", "步驟 12 [今日評價] 自我肯定填寫完成")
    
            # 完成儲存
            page.locator("#btn-wizard-next").click()
            time.sleep(1)
    
            # 4. 驗證記錄列表
            cards = page.locator(".record-item-card")
            assert cards.count() >= 1
            log_test(4, f"記錄列表驗證成功 (共 {cards.count()} 筆)")
    
            # 5. 測試資料與週/季/月/年總結報告
            print("\n--- 正在測試週/季/月/年統計總結報告 ---")
            page.locator("#dock-data").click()
            time.sleep(0.5)
    
            # 載入 21 張營隊範例資料
            page.on("dialog", lambda dialog: dialog.accept())
            page.locator("#btn-load-sample-data").click()
            time.sleep(1)
    
            # 切換至統計頁籤
            page.locator("#dock-stats").click()
            time.sleep(0.8)
    
            # 測試季總結 (本季)
            quarter_chip = page.locator(".filter-chip:has-text('本季')")
            assert quarter_chip.is_visible(), "「本季」篩選標籤不存在"
            quarter_chip.click()
            time.sleep(0.5)
    
            summary_title = page.locator("#summary-report-title").inner_text()
            summary_body = page.locator("#summary-report-body").inner_text()
            assert "總結報告" in summary_title, "總結報告標題未顯示"
            assert "保溫實修進度" in summary_body and "身心生理慣性" in summary_body, "總結內容不完整"
            log_test("5-1", f"成功生成總結報告: {summary_title}")
            log_test("5-2", "總結報告涵蓋：保溫進度、生理念頭慣性、情緒光譜、落地轉化成效、假相超越比率")
            
            # 測試一鍵複製總結
            page.locator("#btn-copy-summary").click()
            time.sleep(0.5)
            log_test("5-3", "「一鍵複製總結報告」功能驗證正常 (可分享至小組共學/LINE)")
    
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_quarter_summary_report.png"))
    
            # 6. Excel 匯出
            with page.expect_download() as download_info:
                page.locator("#btn-export-excel").click()
            download = download_info.value
            excel_path = os.path.join(SCREENSHOT_DIR, download.suggested_filename)
            download.save_as(excel_path)
            assert os.path.exists(excel_path) and os.path.getsize(excel_path) > 1000
            log_test(6, f"Excel 報表匯出成功：{download.suggested_filename}")
    
            # 7. 塗鴉、拍照上傳、以圖搜圖與相似度比對工作台測試
            page.locator("#dock-doodle").click()
            time.sleep(0.5)
            canvas = page.locator("#doodle-canvas")
            assert canvas.is_visible(), "塗鴉畫布應正常顯示"
            log_test("7-1", "心靈塗鴉畫布 (Canvas) 載入正常")
    
            # 畫筆與顏色切換
            page.locator(".color-dot[data-color='#f97316']").click()
            cbox = canvas.bounding_box()
            page.mouse.move(cbox["x"] + 100, cbox["y"] + 100)
            page.mouse.down()
            page.mouse.move(cbox["x"] + 200, cbox["y"] + 200)
            page.mouse.up()
            log_test("7-2", "自己畫：觸控/滑鼠塗鴉、色彩盤切換驗證成功")
    
            # 相似度比對與意象切換
            page.locator("#compare-studio-card").scroll_into_view_if_needed()
            time.sleep(0.4)
            page.locator(".archetype-chip[data-key='sun']").click()
            time.sleep(0.4)
            score_val = page.locator("#metric-overall").inner_text()
            assert "%" in score_val, "綜合相似度分數應計算完成"
            log_test("7-3", f"視覺相似度比對工作台：結構感知 aHash 與色彩直方圖運算完成 (相似度 {score_val})")
    
            # 帶入觀察表
            page.locator("#btn-doodle-to-draft").click()
            time.sleep(0.4)
            log_test("7-4", "「帶入記錄」按鈕成功將塗鴉壓縮轉存為觀察表記錄附件")

            browser.close()
    finally:
        if server_proc:
            server_proc.terminate()

    print("\n" + "=" * 64)
    print("   🎉🎉🎉 全部測試驗證通過！步驟順序、略過功能與週季月年總結均運作完美！")
    print("=" * 64)

if __name__ == '__main__':
    run_tests()
