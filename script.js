const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyZmq_8Jp6DaCjnEuY_B-F8-xef9SxSzV65FzC2O2E7FQAqx_8r0qYDMVUyYERQOPmeYQ/exec';

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

    // Google認証の初期化（ライブラリ読み込み待ち）
    const initGsi = () => {
        if (typeof google !== 'undefined' && google.accounts) {
            initGoogleSignIn();
        } else {
            // console.log('Waiting for Google GSI library...');
            setTimeout(initGsi, 500);
        }
    };
    // DOMContentLoadedの後でもライブラリが未ロードの場合があるため、少し待つかonloadを待つ
    if (document.readyState === 'complete') {
        initGsi();
    } else {
        window.addEventListener('load', initGsi);
    }

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

        // WP設定の反映
        if (currentUser && currentUser.settings) {
            document.getElementById('wp-url').value = currentUser.settings.wpUrl || '';
            document.getElementById('wp-user').value = currentUser.settings.wpUser || '';
            document.getElementById('wp-pass').value = currentUser.settings.wpPass || '';
            document.getElementById('theme-sheet-url').value = currentUser.settings.themeSheetUrl || '';
            document.getElementById('auto-post-time').value = currentUser.settings.autoPostTime || '';
            document.getElementById('wp-status').value = currentUser.settings.wpStatus || 'draft';
        }

        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    // 設定タブ切り替え
    const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
    settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // ボタンのアクティブ切り替え
            settingsTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // コンテンツの切り替え
            const tabName = btn.dataset.tab;
            document.querySelectorAll('.settings-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`settings-tab-${tabName}`).classList.add('active');
        });
    });

    // 4. 設定保存
    saveSettingsBtn.addEventListener('click', async () => {
        setLoading(saveSettingsBtn, true, '保存中...');

        const newSystemPrompt = systemPromptSetting.value;
        const wpSettings = {
            wpUrl: document.getElementById('wp-url').value,
            wpUser: document.getElementById('wp-user').value,
            wpPass: document.getElementById('wp-pass').value,
            themeSheetUrl: document.getElementById('theme-sheet-url').value,
            autoPostTime: document.getElementById('auto-post-time').value,
            wpStatus: document.getElementById('wp-status').value
        };

        try {
            const response = await callGasApi({
                action: 'saveWpSettings',
                email: currentUser.email,
                systemPrompt: newSystemPrompt, // 追加
                ...wpSettings
            });

            if (response.success) {
                // ローカルの状態更新
                systemPrompt = newSystemPrompt;
                if (!currentUser.settings) currentUser.settings = {};
                Object.assign(currentUser.settings, wpSettings);
                currentUser.systemPrompt = newSystemPrompt;
                localStorage.setItem('blog_creator_user', JSON.stringify(currentUser));

                alert('設定を保存しました');
                settingsModal.classList.add('hidden');
            } else {
                alert('保存失敗: ' + (response.message || response.error || '不明なエラー'));
            }
        } catch (e) {
            alert('通信エラー: ' + e.message);
        } finally {
            setLoading(saveSettingsBtn, false);
        }
    });

    // WP投稿 (エディタの内容) - ヘッダーボタン
    document.getElementById('header-post-wp-btn').addEventListener('click', async function () {
        const btn = this;
        setLoading(btn, true, '投稿中...');

        // 設定値の取得（currentUserから）
        const settings = currentUser.settings || {};
        const wpUrl = settings.wpUrl;
        const wpUser = settings.wpUser;
        const wpPass = settings.wpPass;
        const wpStatus = settings.wpStatus || 'draft';

        const title = titleInput.value.trim();
        const content = quill.root.innerHTML; // HTML形式で取得

        if (!wpUrl || !wpUser || !wpPass) {
            alert('WordPressの接続情報が設定されていません。\n設定画面から入力してください。');
            setLoading(btn, false);
            return;
        }

        if (!title) {
            alert('記事タイトルを入力してください');
            setLoading(btn, false);
            return;
        }

        try {
            const response = await callGasApi({
                action: 'postArticle',
                wpUrl, wpUser, wpPass, wpStatus,
                title, content
            });

            if (response.success) {
                alert(`投稿成功！\n記事URL: ${response.url}`);
                window.open(response.url, '_blank');
            } else {
                alert('投稿失敗: ' + (response.error || response.message));
            }
        } catch (e) {
            alert('エラー: ' + e.message);
        } finally {
            setLoading(btn, false);
        }
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
                // response.content が { title: "...", content: "..." } になっている
                const result = response.content;

                // タイトルがオブジェクト内にある場合と、フォールバックで文字列の場合を考慮
                if (typeof result === 'object' && result.title) {
                    titleInput.value = result.title;
                    quill.clipboard.dangerouslyPasteHTML(result.content);
                } else {
                    // 旧形式またはパース失敗時
                    titleInput.value = `【案】${topic}`;
                    quill.clipboard.dangerouslyPasteHTML(result);
                }
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

        console.log('Login Success:', user); // Debug
        console.log('User Settings:', user.settings); // Debug

        if (displayEmail) displayEmail.textContent = user.email;
        if (user.systemPrompt) {
            systemPrompt = user.systemPrompt;
        }

        // 画面切り替え
        loginView.classList.add('hidden');
        appHeader.classList.remove('hidden');
        appContent.classList.remove('hidden');

        // Premiumユーザー判定 (Free以外なら表示)
        const wpBtn = document.getElementById('header-post-wp-btn');
        console.log('User Plan:', user.plan); // Debug
        console.log('WP Button Element:', wpBtn); // Debug

        if (user.plan && user.plan !== 'Free') {
            console.log('Showing WP Button'); // Debug
            wpBtn.classList.remove('hidden');
            // 強制的に表示 (!important)
            wpBtn.style.setProperty('display', 'inline-flex', 'important');
        } else {
            console.log('Hiding WP Button'); // Debug
            wpBtn.classList.add('hidden');
            wpBtn.style.setProperty('display', 'none', 'important');
        }
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
async function initGoogleSignIn() {
    console.log('initGoogleSignIn started'); // Debug
    try {
        // GASからクライアントIDを取得
        console.log('Fetching Google Client ID...'); // Debug

        // const response = await fetch(GAS_API_URL, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        //     body: JSON.stringify({ action: 'getGoogleClientId' })
        // });
        // const data = await response.json();

        // if (!data.success || !data.clientId) {
        //     console.error('Google Client IDの取得に失敗しました');
        //     alert('Google Client IDの取得に失敗しました。GASのデプロイを確認してください。');
        //     return;
        // }

        // const clientId = data.clientId.trim();
        // 確実に動かすためにハードコード
        const clientId = '224521683572-7aa3ruoltk2ps4vcc1a9i9ih9cpeegcj.apps.googleusercontent.com';
        console.log('Google Client ID:', clientId);

        // Google Identity Servicesの初期化
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        // ボタンのレンダリング
        const buttonContainer = document.getElementById('google-signin-button');
        if (buttonContainer) {
            google.accounts.id.renderButton(
                buttonContainer,
                {
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'continue_with',
                    logo_alignment: 'left'
                }
            );
        }

        // ワンタップログインの表示（オプション）
        // google.accounts.id.prompt();

    } catch (e) {
        console.error('Google Sign-In initialization error:', e);
        alert('Googleログインの初期化に失敗しました: ' + e.message);
    }
}

async function handleCredentialResponse(response) {
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

            // Premiumユーザー判定
            const wpBtn = document.getElementById('header-post-wp-btn');
            console.log('User Plan (Login):', user.plan); // Debug

            if (user.plan && user.plan !== 'Free') {
                wpBtn.classList.remove('hidden');
                wpBtn.style.setProperty('display', 'inline-flex', 'important');
            } else {
                wpBtn.classList.add('hidden');
                wpBtn.style.setProperty('display', 'none', 'important');
            }

            // システムプロンプト更新
            if (user.systemPrompt) {
                location.reload(); // プロンプト反映のためリロード
            }
        } else {
            alert('Googleログイン失敗: ' + result.message);
        }
    } catch (e) {
        console.error(e);
        alert('Googleログインエラー');
    }
}
