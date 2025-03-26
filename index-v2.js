// ==UserScript==
// @name         Auto Enable Record for Saleloft Meeting
// @namespace    your-namespace
// @version      1.0
// @description  When detect Edit alternative logging selections auto click Video call options and enable record
// @match        *://meet.google.com/calendar*
// @match        *://calendar.google.com/calendar/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    // 创建通用的DOM观察器
    function createObserver(targetSelector, callback, config = { childList: true, subtree: true }) {
        const observer = new MutationObserver((mutations, obs) => {
            const element = targetSelector();
            if (element) {
                callback(element);
                obs.disconnect();
            }
        });

        observer.observe(document.body, config);
        return observer;
    }

    // 通用的按钮查找函数
    function findButton(buttonLabel) {
        return Array.from(document.querySelectorAll('button')).find(button =>
            button.getAttribute('aria-label') === buttonLabel
        );
    }

    // 点击按钮并执行回调的通用函数
    function clickButton(button, callback = null) {
        setTimeout(() => {
            button.click();
            console.log(`Clicked button: ${button.getAttribute('aria-label')}`);
            if (callback) callback();
        }, 10);
    }

    // 主页面配置功能
    function setupMainPageConfig() {
        // 监听 "Edit alternative logging selections" 按钮的存在性
        createObserver(
            () => {
                const editButton = findButton('Edit alternative logging selections');
                const videoOptionsButton = findButton('Video call options');
                // 只有当两个按钮都存在时才返回 videoOptionsButton
                return editButton && videoOptionsButton ? videoOptionsButton : null;
            },
            (videoButton) => {
                console.log('Found "Edit alternative logging selections", clicking "Video call options"');
                clickButton(videoButton);
            }
        );
    }

    // 设置页面的自动化配置
    function setupSettingsPageConfig() {
        const lastClick = sessionStorage.getItem("settedByBot");
        if (lastClick && new Date().getTime() - lastClick < 60000) {
            console.log('Configuration was recently completed, skipping...');
            return;
        }

        // 监听并点击 "Meeting records" 按钮
        createObserver(
            () => findButton('Meeting records'),
            (button) => {
                clickButton(button, setupRecordingToggle);
            }
        );
    }

    // 配置录制选项
    function setupRecordingToggle() {
        // 监听录制选项复选框
        createObserver(
            () => {
                return Array.from(document.querySelectorAll('input')).find(input =>
                    input.getAttribute('aria-label')?.includes('Starts recording audio and video of the meeting')
                );
            },
            (checkbox) => {
                if (!checkbox.checked) {
                    clickButton(checkbox, setupSaveButton);
                }
            }
        );
    }

    // 设置保存按钮
    function setupSaveButton() {
        // 监听并点击保存按钮
        createObserver(
            () => {
                const saveSpan = Array.from(document.querySelectorAll('span'))
                    .find(span => span.textContent === 'Save');
                return saveSpan?.closest('div')?.querySelector('button');
            },
            (saveButton) => {
                clickButton(saveButton, () => {
                    sessionStorage.setItem('settedByBot', new Date().getTime());
                    console.log('Configuration saved successfully');
                });
            }
        );
    }

    // 主入口：根据URL决定执行哪个配置流程
    function init() {
        console.log("Script initialized on:", document.URL);
        if (document.URL.includes('calendarsettings')) {
            setupSettingsPageConfig();
        } else {
            setupMainPageConfig();
        }
    }

    // 启动脚本
    init();
})();
