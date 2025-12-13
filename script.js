const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxpy6oJOkkN8K0KzoDxmyQIJ8Vzr96hK0ATGfPrlHtcSx1RO5cJHGwEAyB-7ljd5gc/exec';

// 状態管理
let currentUser = null;
let systemPrompt = `あなたはプロのWebライターです。
読者の興味を惹きつける、SEOに強いブログ記事を作成してください。
構成は「導入」「見出しごとの本文」「まとめ」としてください。`;

document.addEventListener('DOMContentLoaded', () => {
    // Quillエディタの初期化
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean']
            ]
        },
        placeholder: 'ここに素晴らしい記事を書きましょう...'
    });

    // --- 要素の取得 ---
    const generateBtn = document.getElementById('generate-btn');
    const topicInput = document.getElementById('topic-input');
    const lengthSelect = document.getElementById('length-select');
    const toneSelect = document.getElementById('tone-select');
    const titleInput = document.getElementById('post-title');
    const copyHtmlBtn = document.getElementById('copy-html-btn');

    // モーダル・認証関連
    const loginView = document.getElementById('login-view');
    const appHeader = document.getElementById('app-header');
    const appContent = document.getElementById('app-content');

    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const logoutBtn = document.getElementById('logout-btn');

    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // 設定関連
    const systemPromptSetting = document.getElementById('system-prompt-setting');
    const improvePromptBtn = document.getElementById('improve-prompt-btn');
    const improveRequest = document.getElementById('improve-request');

    // ユーザー表示
    const displayEmail = document.getElementById('header-email');

    // --- 初期化処理 ---
    checkLoginStatus();
    initGoogleSignIn(); // Google認証の初期化

    // --- イベントリスナー ---

    // 1. 認証タブ切り替え
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Tab clicked:', btn.dataset.tab); // Debug log
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            authSubmitBtn.textContent = btn.dataset.tab === 'login' ? 'ログイン' : '新規登録';
        });
    });

    // 2. ログイン/登録フォーム送信
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmail.value;
        const password = authPassword.value;
        const mode = document.querySelector('.tab-btn.active').dataset.tab; // login or register

        setLoading(authSubmitBtn, true);

        try {
            const response = await callGasApi({
                action: mode,
                email: email,
                password: password
            });

            if (response.success) {
                if (mode === 'login') {
                    loginSuccess(response.user);
                } else {
                    alert(response.message); // 登録メール送信完了メッセージ
                }
            } else {
                alert(response.message || 'エラーが発生しました');
            }
        } catch (error) {
            alert('通信エラーが発生しました: ' + error.message);
        } finally {
            setLoading(authSubmitBtn, false);
        }
    });

    // 3. 設定モーダル開閉
    settingsBtn.addEventListener('click', () => {
        systemPromptSetting.value = systemPrompt; // 現在の値をセット
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    // 4. 設定保存
    saveSettingsBtn.addEventListener('click', () => {
        systemPrompt = systemPromptSetting.value;
        settingsModal.classList.add('hidden');
        alert('設定を保存しました（一時的）');
    });

    // 5. AIによるプロンプト改善
    improvePromptBtn.addEventListener('click', async () => {
        const request = improveRequest.value;
        if (!request) {
            alert('改善の要望を入力してください');
            return;
        }

        setLoading(improvePromptBtn, true);

        try {
            const response = await callGasApi({
                action: 'optimizePrompt',
                currentPrompt: systemPromptSetting.value,
                request: request
            });

            if (response.success) {
                systemPromptSetting.value = response.optimizedPrompt;
                alert('プロンプトを改善しました！');
            } else {
                alert('改善に失敗しました: ' + (response.error || '不明なエラー'));
            }
        } catch (error) {
            alert('エラー: ' + error.message);
        } finally {
            setLoading(improvePromptBtn, false);
        }
    });

    // 6. ログアウト
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('blog_creator_user');
        location.reload();
    });

    // 7. 記事生成
    generateBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();

        if (!topic) {
            alert('テーマを入力してください');
            return;
        }

        setLoading(generateBtn, true, '生成中...');

        try {
            // プロンプトの組み立て
            const fullPrompt = `
${systemPrompt}

【条件】
- テーマ: ${topic}
- 文字数目安: ${lengthSelect.options[lengthSelect.selectedIndex].text}
- トーン: ${toneSelect.options[toneSelect.selectedIndex].text}
            `;

            const response = await callGasApi({
                action: 'generate',
                topic: fullPrompt
            });

            if (response.success) {
                titleInput.value = `【案】${topic}`;
                quill.clipboard.dangerouslyPasteHTML(response.content);
            } else {
                throw new Error(response.error || '生成失敗');
            }

        } catch (error) {
            console.error('Error:', error);
            alert(`エラーが発生しました:\n${error.message}`);
        } finally {
            setLoading(generateBtn, false);
        }
    });

    // 8. HTMLコピー
    copyHtmlBtn.addEventListener('click', () => {
        const html = quill.root.innerHTML;
        navigator.clipboard.writeText(html).then(() => {
            const originalText = copyHtmlBtn.innerHTML;
            copyHtmlBtn.innerHTML = '<span class="icon">✅</span> コピー完了';
            setTimeout(() => {
                copyHtmlBtn.innerHTML = originalText;
            }, 2000);
        });
    });

    // --- ヘルパー関数 ---

    function checkLoginStatus() {
        const savedUser = localStorage.getItem('blog_creator_user');
        if (savedUser) {
            loginSuccess(JSON.parse(savedUser));
        } else {
            // 未ログイン時はログイン画面を表示
            loginView.classList.remove('hidden');
            appHeader.classList.add('hidden');
            appContent.classList.add('hidden');
        }
    }

    function loginSuccess(user) {
        currentUser = user;
        localStorage.setItem('blog_creator_user', JSON.stringify(user));

        if (displayEmail) displayEmail.textContent = user.email;
        if (user.systemPrompt) {
            systemPrompt = user.systemPrompt;
        }

        // 画面切り替え
        loginView.classList.add('hidden');
        appHeader.classList.remove('hidden');
        appContent.classList.remove('hidden');
    }

    async function callGasApi(data) {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const textResult = await response.text();
        try {
            return JSON.parse(textResult);
        } catch (e) {
            console.error("Raw Response:", textResult);
            throw new Error("サーバーからの応答が不正です");
        }
    }

    function setLoading(btn, isLoading, loadingText = '処理中...') {
        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = `<span class="sparkle">⏳</span> ${loadingText}`;
            btn.disabled = true;
        } else {
            btn.innerHTML = btn.dataset.originalText;
            btn.disabled = false;
        }
    }
});

// ========================================
// Google認証（ROOMアシスタント方式）
// ========================================

/**
 * Google Sign-Inを初期化
 */
async function initGoogleSignIn() {
    try {
        // GAS APIを呼び出すためのヘルパー関数を再定義（スコープ外のため）
        const callGas = async (data) => {
            const res = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data)
            });
            return res.json();
        };

        // GASからGoogle Client IDを取得
        const res = await callGas({ action: 'getGoogleClientId' });

        if (!res.success || !res.clientId) {
            console.log('Google Client ID が設定されていません');
            return;
        }

        const clientId = res.clientId;

        // Google Sign-Inボタンを初期化
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse
        });

        // ボタンをレンダリング
        const container = document.getElementById('google-signin-button');
        if (container) {
            google.accounts.id.renderButton(
                container,
                {
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'left',
                    width: '300'
                }
            );
        }

        console.log('Google Sign-In 初期化完了');

    } catch (error) {
        console.error('Google Sign-In 初期化エラー:', error);
    }
}

// Googleログインのコールバック
async function handleCredentialResponse(response) {
    try {
        // GAS APIを呼び出すためのヘルパー関数を再定義
        const callGas = async (data) => {
            const res = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data)
            });
            return res.json();
        };

        const result = await callGas({
            action: 'googleLogin',
            idToken: response.credential
        });

        if (result.success) {
            // ログイン成功処理
            const user = result.user;
            localStorage.setItem('blog_creator_user', JSON.stringify(user));

            // 画面切り替え
            const displayEmail = document.getElementById('header-email');
            if (displayEmail) displayEmail.textContent = user.email;

            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('app-header').classList.remove('hidden');
            document.getElementById('app-content').classList.remove('hidden');

            // システムプロンプト更新
            if (user.systemPrompt) {
                location.reload();
            }
        } else {
            alert('Googleログイン失敗: ' + result.message);
        }
    } catch (e) {
        console.error(e);
        alert('Googleログインエラー');
    }
}
