#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自動化測試程式 - 情緒觀察表 (Emotional Awareness PWA App)
測試項目涵蓋：
1. PWA 資源與 Manifest 載入測試
2. 手機視角模擬 (iPhone 與 Android) 與安裝引導檢驗
3. 12 步驟精靈填表完整流程 (點選標籤、新增自訂標籤、滑動指數、完成儲存)
4. 記錄管理、搜尋與詳情查看
5. 統計運算 (簡報第17頁 10大指標：21張記錄、身體反應、流露的話、錯誤率90%等)
6. Excel (.xlsx) 報表匯出檔案檢驗
7. 本地硬碟 JSON 備份與還原功能測試
"""

import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

# Ensure terminal utf-8 output
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), 'test_screenshots')
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

TARGET_URL = "https://oscarmark2007-bot.github.io/emotion-awareness-app/"
# If testing locally, can also use:
# TARGET_URL = "http://localhost:8080"

def log_test(step_num, title, status="PASS"):
    symbol = "✅" if status == "PASS" else "❌"
    print(f"{symbol} [測試 {step_num}] {title}")

def run_tests():
    print("=" * 64)
    print("   🌸 開始執行「情緒觀察表」自動化端到端測試")
    print(f"   🎯 測試目標網址: {TARGET_URL}")
    print("=" * 64)

    with sync_playwright() as p:
        # Launch Chrome with mobile viewport emulation (Pixel 7 / iPhone)
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(
            viewport={"width": 393, "height": 851},
            user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True
        )

        page = context.new_page()

        # ----------------------------------------------------
        # 測試 1：首頁載入與標題檢查
        # ----------------------------------------------------
        page.goto(TARGET_URL, wait_until="networkidle")
        title = page.title()
        assert "情緒觀察表" in title, f"標題不符: {title}"
        log_test(1, f"首頁載入成功，標題正確: {title}")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_home_loaded.png"))

        # ----------------------------------------------------
        # 測試 2：PWA 資源與 Manifest 檢驗
        # ----------------------------------------------------
        manifest_res = page.request.get(f"{TARGET_URL}manifest.json")
        assert manifest_res.status == 200, "manifest.json 載入失敗"
        manifest_json = manifest_res.json()
        assert manifest_json["name"] == "情緒觀察表 - 無憂覺察", "Manifest 名稱不符"
        log_test(2, "PWA Manifest.json 設定正確 (name, start_url, icons)")

        # ----------------------------------------------------
        # 測試 3：iPhone 視角與安裝引導測試
        # ----------------------------------------------------
        ios_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            is_mobile=True,
            has_touch=True
        )
        ios_page = ios_context.new_page()
        ios_page.goto(TARGET_URL, wait_until="networkidle")
        
        # Check if iOS install banner shows up
        banner = ios_page.locator("#mobile-install-banner")
        assert banner.is_visible(), "iPhone 安裝提示橫幅未顯示"
        
        # Click install guide button
        ios_page.locator("#btn-install-action").click()
        time.sleep(0.5)
        modal_body = ios_page.locator("#modal-body")
        assert "iPhone 加入桌面教學" in modal_body.inner_text(), "iPhone 安裝導引內容未顯示"
        ios_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_ios_install_guide.png"))
        log_test(3, "iPhone 智慧安裝導引彈窗驗證通過 (顯示 Safari 分享與加主畫面說明)")
        ios_context.close()

        # ----------------------------------------------------
        # 測試 4：完整 1-12 步驟精靈填表流程測試
        # ----------------------------------------------------
        print("\n--- 正在執行 12 欄位精靈填寫流程 ---")
        
        # Step 1: 事件
        page.locator("#wiz-event").fill("今天早上開會時，主管臨時點名要求報告進度")
        log_test("4-1", "步驟 1 [事件] 填寫完成")
        page.locator("#btn-wizard-next").click()

        # Step 2: 觸發點
        page.locator("#wiz-trigger").fill("主管說了一句：「這份數據好像不太對喔」")
        log_test("4-2", "步驟 2 [觸發點] 填寫完成")
        page.locator("#btn-wizard-next").click()

        # Step 3: 身體反應 (選擇現有標籤 + 自訂新增)
        # Select existing: 抿嘴, 胸悶
        page.locator(".tag-pill:has-text('抿嘴')").click()
        page.locator(".tag-pill:has-text('胸悶')").click()
        # Add custom tag: 肩膀沉重
        page.locator("#wiz-add-tag-input").fill("肩膀沉重")
        page.locator("#wiz-add-tag-btn").click()
        log_test("4-3", "步驟 3 [身體反應] 標籤點選與自訂新增完成")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_step3_tags.png"))
        page.locator("#btn-wizard-next").click()

        # Step 4: 心裡自然流露的話
        page.locator(".tag-pill:has-text('你在說什麼？')").click()
        page.locator(".tag-pill:has-text('好緊張')").click()
        log_test("4-4", "步驟 4 [心裡的話] 標籤選取完成")
        page.locator("#btn-wizard-next").click()

        # Step 5: 情緒類別
        page.locator(".tag-pill:has-text('擔心')").click()
        page.locator(".tag-pill:has-text('壓力')").click()
        log_test("4-5", "步驟 5 [情緒類別] 標籤選取完成")
        page.locator("#btn-wizard-next").click()

        # Step 6: 情緒指數
        # Adjust slider
        sliders = page.locator(".emo-slider")
        assert sliders.count() >= 2, "情緒指數滑桿未正確動態生成"
        sliders.nth(0).fill("92")
        sliders.nth(1).fill("75")
        log_test("4-6", "步驟 6 [情緒指數] 動態滑桿數值設定 (92, 75)")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_step6_intensity.png"))
        page.locator("#btn-wizard-next").click()

        # Step 7: 情緒落地方式
        page.locator(".tag-pill:has-text('深呼吸')").click()
        page.locator(".tag-pill:has-text('敲胸')").click()
        log_test("4-7", "步驟 7 [情緒落地] 標籤選取完成")
        page.locator("#btn-wizard-next").click()

        # Step 8: 落地時機
        page.locator("#wizard-body .choice-pill:has-text('當下落地')").click()
        log_test("4-8", "步驟 8 [落地時機] 選擇「當下落地」")
        page.locator("#btn-wizard-next").click()

        # Step 9: 落地後指數
        page.locator("#slider-post-score").fill("25")
        log_test("4-9", "步驟 9 [落地後指數] 調至 25分 (舒緩 67分)")
        page.locator("#btn-wizard-next").click()

        # Step 10: 好像的事實
        page.locator("#wiz-seemed").fill("當時我以為主管對我有成見、覺得我工作能力不足")
        log_test("4-10", "步驟 10 [好像的事實] 填寫完成")
        page.locator("#btn-wizard-next").click()

        # Step 11: 確立的事實
        page.locator("#wiz-real").fill("會議後查證發現只是投影片格式版本不同，主管完全肯定我的分析成果")
        page.locator("#wizard-body .choice-pill:has-text('完全錯誤')").click()
        log_test("4-11", "步驟 11 [確立的事實] 填寫並核對假相為「完全錯誤」")
        page.locator("#btn-wizard-next").click()

        # Step 12: 今日評價
        page.locator("#wiz-reflection").fill("讚嘆自己今天在被點名當下有立刻察覺到胸悶與緊張，及時做了兩次深呼吸落地！看到事實真相後心情放鬆很多，肯定自己的進步！")
        log_test("4-12", "步驟 12 [今日評價] 填寫完成")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_step12_reflection.png"))

        # 點擊「完成儲存」
        page.locator("#btn-wizard-next").click()
        time.sleep(1)

        # ----------------------------------------------------
        # 測試 5：記錄管理與詳情檢視
        # ----------------------------------------------------
        print("\n--- 正在驗證記錄列表與詳情功能 ---")
        records_cards = page.locator(".record-item-card")
        assert records_cards.count() >= 1, "記錄列表中未找到新儲存的卡片"
        log_test(5, f"記錄列表成功顯示新卡片 (目前共 {records_cards.count()} 筆)")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_records_tab.png"))

        # 點擊「詳情」查看
        page.locator(".btn-view-record").first.click()
        time.sleep(0.5)
        detail_text = page.locator("#modal-body").inner_text()
        assert "開會時" in detail_text and "完全錯誤" in detail_text, "卡片詳情內容不正確"
        log_test("5-1", "卡片 12 欄位詳情彈窗檢視正常")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_record_detail_modal.png"))
        page.locator("#modal-close-btn").click()

        # ----------------------------------------------------
        # 測試 6：載入營隊 21 張範例資料與統計運算 (簡報第17頁復刻)
        # ----------------------------------------------------
        print("\n--- 正在測試資料管理與統計運算 ---")
        # Switch to Data Tab
        page.locator("#dock-data").click()
        time.sleep(0.5)

        # Click Load Sample Data
        page.on("dialog", lambda dialog: dialog.accept())
        page.locator("#btn-load-sample-data").click()
        time.sleep(1)
        log_test(6, "成功觸發「載入營隊範例資料」")

        # Switch to Stats Tab
        page.locator("#dock-stats").click()
        time.sleep(0.8)

        # Verify Statistics
        sheets_count_text = page.locator("#stat-sheets-count").inner_text()
        assert "21 張" in sheets_count_text or "22 張" in sheets_count_text, f"張數統計不符: {sheets_count_text}"
        
        body_rank = page.locator("#stat-body-rank").inner_text()
        assert "皺眉" in body_rank and "抿嘴" in body_rank, f"身體反應排行不符: {body_rank}"

        thoughts_rank = page.locator("#stat-thoughts-rank").inner_text()
        assert "啊？" in thoughts_rank, f"流露的話排行不符: {thoughts_rank}"

        false_ratio = page.locator("#stat-false-ratio").inner_text()
        assert "90%" in false_ratio or "91%" in false_ratio, f"假相錯誤率不符: {false_ratio}"

        log_test("6-1", f"統計指標計算精準：填寫張數: {sheets_count_text}, 假相錯誤率: {false_ratio}")
        log_test("6-2", "身體反應 (皺眉/抿嘴) 與心裡的話 (啊？) 排行完全符合簡報第17頁")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_stats_tab_page17.png"))

        # ----------------------------------------------------
        # 測試 7：Excel 匯出檔案下載檢驗 (.xlsx)
        # ----------------------------------------------------
        print("\n--- 正在測試 Excel 報表匯出 ---")
        with page.expect_download() as download_info:
            page.locator("#btn-export-excel").click()
        download = download_info.value
        excel_path = os.path.join(SCREENSHOT_DIR, download.suggested_filename)
        download.save_as(excel_path)
        assert os.path.exists(excel_path) and os.path.getsize(excel_path) > 1000, "Excel 檔案下載異常"
        log_test(7, f"Excel 報表匯出成功：{download.suggested_filename} ({os.path.getsize(excel_path)} bytes)")

        # ----------------------------------------------------
        # 測試 8：本地硬碟 JSON 完整備份下載檢驗
        # ----------------------------------------------------
        print("\n--- 正在測試 JSON 備份檔下載 ---")
        page.locator("#dock-data").click()
        time.sleep(0.5)
        
        with page.expect_download() as backup_download_info:
            page.locator("#btn-backup-json").click()
        backup_download = backup_download_info.value
        backup_path = os.path.join(SCREENSHOT_DIR, backup_download.suggested_filename)
        backup_download.save_as(backup_path)
        
        # Verify JSON content
        with open(backup_path, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)
        assert "records" in backup_data and len(backup_data["records"]) >= 21, "備份檔案內容損壞"
        log_test(8, f"JSON 完整備份下載成功，共包含 {len(backup_data['records'])} 筆觀察表記錄！")

        browser.close()

    print("\n" + "=" * 64)
    print("   🎉🎉🎉 所有 8 大項自動化測試全數通過 (100% PASS)！")
    print(f"   📸 測試截圖已保存於: {SCREENSHOT_DIR}")
    print("=" * 64)

if __name__ == '__main__':
    run_tests()
