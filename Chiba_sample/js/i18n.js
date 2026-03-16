/**
 * ======================================================================
 * 多言語対応モジュール (i18n.js)
 *
 * 対応言語（9言語）:
 *   ja - 日本語（デフォルト）
 *   en - English
 *   zh - 简体中文
 *   zh-TW - 繁體中文
 *   ko - 한국어
 *   fr - Français
 *   es - Español
 *   de - Deutsch
 *   pt - Português
 * ======================================================================
 */

const I18N_TRANSLATIONS = {

    // ================================================================
    // 日本語（デフォルト）
    // ================================================================
    ja: {
        header_filter:      '写真フィルター',
        header_face_ar:     'Face ARデコレーション',
        header_message:     'メッセージ編集',
        header_frame:       'フレーム選択',
        header_print_settings: '印刷設定',

        capture_btn:        '',
        retake_btn:         '再撮影',
        print_btn:          'レシート印刷',

        msg_panel_title:    '表示メッセージ',
        msg_date_label:     '日付',
        msg_text_label:     'メッセージ',
        msg_location_label: '場所',
        msg_show:           '表示',
        msg_apply:          '適用',
        msg_default_text:   'Happy Anniversary',
        msg_edit_location:  '編集',

        filter_panel_title: '写真フィルター',
        face_ar_title:      'Face AR デコレーション',
        frame_panel_title:       'フレームを選択',
        frame_section_common:    'フレーム',
        intensity_label:         '強度',
        preview_guide_hint:      'フレーム内に収まるよう調整してください',
        frame_none:              'なし',

        print_settings_title:    '印刷設定',
        print_ratio_label:       '写真の比率',
        print_margin_label:      '余白',
        margin_none:             'なし',
        margin_top:              '写真の上',
        margin_bottom:           '写真の下',

        result_title:       '撮影完了',
        // save_hint:          '画像を長押しして「写真に保存」もできます',

        close:              '',
        loading:            '読み込み中...',
        error_camera:       'カメラが起動できませんでした',
        lang_select:        '言語',

        cat_none:           'なし',
        cat_head:           '頭部・帽子',
        cat_eyes:           '目元',
        cat_nose:           '鼻元',
        cat_mouth:          '口元',
        cat_face:           '顔全体',
        cat_animal:         '動物変身',
        cat_seasonal:       '季節・イベント',
        cat_accessory:      'アクセサリー',

        retry_btn:              '再試行',
        switch_camera_title:    'カメラ切り替え',
        camera_loading:         'カメラを起動中...',
    },

    // ================================================================
    // English
    // ================================================================
    en: {
        header_filter:      'Photo Filter',
        header_face_ar:     'Face AR Decoration',
        header_message:     'Edit Message',
        header_frame:       'Select Frame',
        header_print_settings: 'Print Settings',

        capture_btn:        '',
        retake_btn:         'Retake',
        print_btn:          'Receipt Print',

        msg_panel_title:    'Message',
        msg_date_label:     'Date',
        msg_text_label:     'Message',
        msg_location_label: 'Location',
        msg_show:           'Show',
        msg_apply:          'Apply',
        msg_default_text:   'Happy Anniversary!',
        msg_edit_location:  'Edit',

        filter_panel_title: 'Photo Filter',
        face_ar_title:      'Face AR Decoration',
        frame_panel_title:       'Select Frame',
        frame_section_common:    'Frames',
        intensity_label:    'Intensity',
        preview_guide_hint: 'Position yourself within the frame',
        frame_none:         'None',

        print_settings_title:    'Print Settings',
        print_ratio_label:       'Photo Ratio',
        print_margin_label:      'Margin',
        margin_none:             'None',
        margin_top:              'Above photo',
        margin_bottom:           'Below photo',

        result_title:       'Photo Taken',
        save_hint:          'Long-press image to "Save to Photos"',

        close:              '',
        loading:            'Loading...',
        error_camera:       'Could not start the camera',
        lang_select:        'Language',

        cat_none:           'None',
        cat_head:           'Head / Hat',
        cat_eyes:           'Eyes',
        cat_nose:           'Nose',
        cat_mouth:          'Mouth',
        cat_face:           'Full Face',
        cat_animal:         'Animal',
        cat_seasonal:       'Seasonal / Events',
        cat_accessory:      'Accessories',

        retry_btn:              'Retry',
        switch_camera_title:    'Switch Camera',
        camera_loading:         'Starting camera...',
    },

    // ================================================================
    // 简体中文
    // ================================================================
    zh: {
        header_filter:      '照片滤镜',
        header_face_ar:     'Face AR 装饰',
        header_message:     '编辑留言',
        header_frame:       '选择边框',
        header_print_settings: '打印设置',

        capture_btn:        '',
        retake_btn:         '重新拍摄',
        print_btn:          '小票打印',

        msg_panel_title:    '留言',
        msg_date_label:     '日期',
        msg_text_label:     '留言',
        msg_location_label: '地点',
        msg_show:           '显示',
        msg_apply:          '应用',
        msg_default_text:   '纪念日快乐！',
        msg_edit_location:  '编辑',

        filter_panel_title: '照片滤镜',
        face_ar_title:      'Face AR 装饰',
        frame_panel_title:       '选择边框',
        frame_section_common:    '边框',
        intensity_label:    '强度',
        preview_guide_hint: '请调整位置以适应边框',
        frame_none:         '无',

        print_settings_title:    '打印设置',
        print_ratio_label:       '照片比例',
        print_margin_label:      '留白',
        margin_none:             '无',
        margin_top:              '照片上方',
        margin_bottom:           '照片下方',

        result_title:       '拍摄完成',
        save_hint:          '长按图片可直接保存到相册',

        close:              '',
        loading:            '加载中...',
        error_camera:       '无法启动摄像头',
        lang_select:        '语言',

        cat_none:           '无',
        cat_head:           '头部 / 帽子',
        cat_eyes:           '眼部',
        cat_nose:           '鼻部',
        cat_mouth:          '口部',
        cat_face:           '全脸',
        cat_animal:         '动物变身',
        cat_seasonal:       '节日 / 活动',
        cat_accessory:      '配饰',

        retry_btn:              '重试',
        switch_camera_title:    '切换摄像头',
        camera_loading:         '正在启动摄像头...',
    },

    // ================================================================
    // 繁體中文
    // ================================================================
    'zh-TW': {
        header_filter: '相片濾鏡', header_face_ar: 'Face AR 裝飾', header_message: '編輯留言',
        header_frame: '選擇邊框', header_print_settings: '列印設定',
        capture_btn: '', retake_btn: '重新拍攝', print_btn: '小票列印',
        msg_panel_title: '留言', msg_date_label: '日期', msg_text_label: '留言',
        msg_location_label: '地點', msg_show: '顯示', msg_apply: '套用',
        msg_default_text: '紀念日快樂！', msg_edit_location: '編輯',
        filter_panel_title: '相片濾鏡', face_ar_title: 'Face AR 裝飾',
        frame_panel_title: '選擇邊框', frame_section_common: '邊框',
        intensity_label: '強度', preview_guide_hint: '請調整位置以配合框架', frame_none: '無',
        print_settings_title: '列印設定', print_ratio_label: '照片比例', print_margin_label: '留白',
        margin_none: '無', margin_top: '照片上方', margin_bottom: '照片下方',
        result_title: '拍攝完成', save_hint: '長按圖片可直接儲存到相簿',
        close: '', loading: '載入中...', error_camera: '無法啟動攝影機', lang_select: '語言',
        cat_none: '無', cat_head: '頭部 / 帽子', cat_eyes: '眼部', cat_nose: '鼻部',
        cat_mouth: '口部', cat_face: '全臉', cat_animal: '動物變身',
        cat_seasonal: '節日 / 活動', cat_accessory: '配件',
        retry_btn: '重試', switch_camera_title: '切換攝影機', camera_loading: '正在啟動攝影機...',
    },

    // ================================================================
    // 한국어
    // ================================================================
    ko: {
        header_filter: '사진 필터', header_face_ar: 'Face AR 데코레이션', header_message: '메시지 편집',
        header_frame: '프레임 선택', header_print_settings: '인쇄 설정',
        capture_btn: '', retake_btn: '다시 찍기', print_btn: '영수증 인쇄',
        msg_panel_title: '메시지', msg_date_label: '날짜', msg_text_label: '메시지',
        msg_location_label: '장소', msg_show: '표시', msg_apply: '적용',
        msg_default_text: '기념일을 축하합니다!', msg_edit_location: '편집',
        filter_panel_title: '사진 필터', face_ar_title: 'Face AR 데코레이션',
        frame_panel_title: '프레임 선택', frame_section_common: '프레임',
        intensity_label: '강도', preview_guide_hint: '프레임 내에 맞게 조정하세요', frame_none: '없음',
        print_settings_title: '인쇄 설정', print_ratio_label: '사진 비율', print_margin_label: '여백',
        margin_none: '없음', margin_top: '사진 위', margin_bottom: '사진 아래',
        result_title: '촬영 완료', save_hint: '이미지를 길게 눌러 사진에 저장할 수 있습니다',
        close: '', loading: '로딩 중...', error_camera: '카메라를 시작할 수 없습니다', lang_select: '언어',
        cat_none: '없음', cat_head: '머리 / 모자', cat_eyes: '눈 주변', cat_nose: '코 주변',
        cat_mouth: '입 주변', cat_face: '얼굴 전체', cat_animal: '동물 변신',
        cat_seasonal: '계절 / 이벤트', cat_accessory: '액세서리',
        retry_btn: '다시 시도', switch_camera_title: '카메라 전환', camera_loading: '카메라 시작 중...',
    },

    // ================================================================
    // Français
    // ================================================================
    fr: {
        header_filter: 'Filtre Photo', header_face_ar: 'Decoration Face AR', header_message: 'Modifier le message',
        header_frame: 'Choisir un cadre', header_print_settings: 'Reglages impression',
        capture_btn: '', retake_btn: 'Reprendre', print_btn: 'Imprimer ticket',
        msg_panel_title: 'Message', msg_date_label: 'Date', msg_text_label: 'Message',
        msg_location_label: 'Lieu', msg_show: 'Afficher', msg_apply: 'Appliquer',
        msg_default_text: 'Joyeux anniversaire !', msg_edit_location: 'Modifier',
        filter_panel_title: 'Filtre Photo', face_ar_title: 'Decoration Face AR',
        frame_panel_title: 'Choisir un cadre', frame_section_common: 'Cadres',
        intensity_label: 'Intensite', preview_guide_hint: 'Ajustez votre position dans le cadre', frame_none: 'Aucun',
        print_settings_title: 'Reglages impression', print_ratio_label: 'Ratio photo', print_margin_label: 'Marge',
        margin_none: 'Aucune', margin_top: 'Au-dessus', margin_bottom: 'En dessous',
        result_title: 'Photo prise', save_hint: 'Appui long sur l\'image pour enregistrer dans Photos',
        close: '', loading: 'Chargement...', error_camera: 'Impossible de demarrer la camera', lang_select: 'Langue',
        cat_none: 'Aucun', cat_head: 'Tete / Chapeau', cat_eyes: 'Yeux', cat_nose: 'Nez',
        cat_mouth: 'Bouche', cat_face: 'Visage entier', cat_animal: 'Transformation animale',
        cat_seasonal: 'Saisonnier / Evenements', cat_accessory: 'Accessoires',
        retry_btn: 'Reessayer', switch_camera_title: 'Changer de camera', camera_loading: 'Demarrage de la camera...',
    },

    // ================================================================
    // Espanol
    // ================================================================
    es: {
        header_filter: 'Filtro de foto', header_face_ar: 'Decoracion Face AR', header_message: 'Editar mensaje',
        header_frame: 'Seleccionar marco', header_print_settings: 'Config. impresion',
        capture_btn: '', retake_btn: 'Volver a tomar', print_btn: 'Imprimir recibo',
        msg_panel_title: 'Mensaje', msg_date_label: 'Fecha', msg_text_label: 'Mensaje',
        msg_location_label: 'Lugar', msg_show: 'Mostrar', msg_apply: 'Aplicar',
        msg_default_text: 'Feliz aniversario!', msg_edit_location: 'Editar',
        filter_panel_title: 'Filtro de foto', face_ar_title: 'Decoracion Face AR',
        frame_panel_title: 'Seleccionar marco', frame_section_common: 'Marcos',
        intensity_label: 'Intensidad', preview_guide_hint: 'Ajuste su posicion dentro del marco', frame_none: 'Ninguno',
        print_settings_title: 'Config. impresion', print_ratio_label: 'Ratio foto', print_margin_label: 'Margen',
        margin_none: 'Ninguno', margin_top: 'Encima', margin_bottom: 'Debajo',
        result_title: 'Foto tomada', save_hint: 'Manten pulsada la imagen para guardar en Fotos',
        close: '', loading: 'Cargando...', error_camera: 'No se puede iniciar la camara', lang_select: 'Idioma',
        cat_none: 'Ninguno', cat_head: 'Cabeza / Sombrero', cat_eyes: 'Ojos', cat_nose: 'Nariz',
        cat_mouth: 'Boca', cat_face: 'Cara completa', cat_animal: 'Transformacion animal',
        cat_seasonal: 'Temporada / Eventos', cat_accessory: 'Accesorios',
        retry_btn: 'Reintentar', switch_camera_title: 'Cambiar camara', camera_loading: 'Iniciando camara...',
    },

    // ================================================================
    // Deutsch
    // ================================================================
    de: {
        header_filter: 'Fotofilter', header_face_ar: 'Face-AR-Dekoration', header_message: 'Nachricht bearbeiten',
        header_frame: 'Rahmen wahlen', header_print_settings: 'Druckeinstellungen',
        capture_btn: '', retake_btn: 'Neu aufnehmen', print_btn: 'Bondruck',
        msg_panel_title: 'Nachricht', msg_date_label: 'Datum', msg_text_label: 'Nachricht',
        msg_location_label: 'Ort', msg_show: 'Anzeigen', msg_apply: 'Anwenden',
        msg_default_text: 'Alles Gute zum Jahrestag!', msg_edit_location: 'Bearbeiten',
        filter_panel_title: 'Fotofilter', face_ar_title: 'Face-AR-Dekoration',
        frame_panel_title: 'Rahmen wahlen', frame_section_common: 'Rahmen',
        intensity_label: 'Intensitat', preview_guide_hint: 'Positionieren Sie sich im Rahmen', frame_none: 'Keiner',
        print_settings_title: 'Druckeinstellungen', print_ratio_label: 'Fotoverhaltnis', print_margin_label: 'Rand',
        margin_none: 'Keiner', margin_top: 'Uber dem Foto', margin_bottom: 'Unter dem Foto',
        result_title: 'Foto aufgenommen', save_hint: 'Bild gedruckt halten, um in Fotos zu speichern',
        close: '', loading: 'Laden...', error_camera: 'Kamera konnte nicht gestartet werden', lang_select: 'Sprache',
        cat_none: 'Keiner', cat_head: 'Kopf / Hut', cat_eyes: 'Augen', cat_nose: 'Nase',
        cat_mouth: 'Mund', cat_face: 'Ganzes Gesicht', cat_animal: 'Tierverwandlung',
        cat_seasonal: 'Saisonal / Events', cat_accessory: 'Accessoires',
        retry_btn: 'Wiederholen', switch_camera_title: 'Kamera wechseln', camera_loading: 'Kamera wird gestartet...',
    },

    // ================================================================
    // Portugues
    // ================================================================
    pt: {
        header_filter: 'Filtro de foto', header_face_ar: 'Decoracao Face AR', header_message: 'Editar mensagem',
        header_frame: 'Selecionar moldura', header_print_settings: 'Config. impressao',
        capture_btn: '', retake_btn: 'Tirar novamente', print_btn: 'Imprimir recibo',
        msg_panel_title: 'Mensagem', msg_date_label: 'Data', msg_text_label: 'Mensagem',
        msg_location_label: 'Local', msg_show: 'Mostrar', msg_apply: 'Aplicar',
        msg_default_text: 'Feliz aniversario!', msg_edit_location: 'Editar',
        filter_panel_title: 'Filtro de foto', face_ar_title: 'Decoracao Face AR',
        frame_panel_title: 'Selecionar moldura', frame_section_common: 'Molduras',
        intensity_label: 'Intensidade', preview_guide_hint: 'Ajuste sua posicao dentro da moldura', frame_none: 'Nenhum',
        print_settings_title: 'Config. impressao', print_ratio_label: 'Ratio foto', print_margin_label: 'Margem',
        margin_none: 'Nenhuma', margin_top: 'Acima', margin_bottom: 'Abaixo',
        result_title: 'Foto tirada', save_hint: 'Pressione e segure a imagem para guardar em Fotos',
        close: '', loading: 'A carregar...', error_camera: 'Nao foi possivel iniciar a camara', lang_select: 'Idioma',
        cat_none: 'Nenhum', cat_head: 'Cabeca / Chapeu', cat_eyes: 'Olhos', cat_nose: 'Nariz',
        cat_mouth: 'Boca', cat_face: 'Rosto inteiro', cat_animal: 'Transformacao animal',
        cat_seasonal: 'Sazonal / Eventos', cat_accessory: 'Acessorios',
        retry_btn: 'Tentar novamente', switch_camera_title: 'Trocar camera', camera_loading: 'Iniciando camera...',
    }
};

// ================================================================
// 現在の言語設定（デフォルト: 日本語）
// ================================================================
let currentLang = localStorage.getItem('sph_lang') || 'ja';

/**
 * 翻訳文字列を返す
 * @param {string} key - 翻訳キー
 * @returns {string} 翻訳済み文字列（存在しない場合は日本語または key 自身）
 */
function t(key) {
    const dict = I18N_TRANSLATIONS[currentLang] || I18N_TRANSLATIONS['ja'];
    return dict[key] || I18N_TRANSLATIONS['ja'][key] || key;
}

/** 全言語のデフォルトメッセージと一致するか判定 */
function _isKnownDefault(val) {
    for (var k in I18N_TRANSLATIONS) {
        if (I18N_TRANSLATIONS[k].msg_default_text === val) return true;
    }
    return false;
}

/**
 * 言語を切り替えて全 UI に再適用する
 * @param {string} lang - 言語コード（'ja','en','zh','zh-TW','ko','fr','es','de','pt'）
 */
function setLanguage(lang) {
    if (!I18N_TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem('sph_lang', lang);
    if (typeof trackLangChange === 'function') trackLangChange(lang);
    applyTranslations();
    // デフォルトメッセージ文字列を言語に合わせて更新（ユーザーが編集済みの場合はスキップ）
    const msgInput = document.getElementById('message-text');
    if (msgInput && typeof messageConfig !== 'undefined') {
        const newDefault = t('msg_default_text');
        const currentVal = (messageConfig.text.value || '').trim();
        const isCustom = currentVal !== '' && !_isKnownDefault(currentVal);
        if (!isCustom) {
            msgInput.value = newDefault;
            messageConfig.text.value = newDefault;
        }
    }
    if (typeof updatePreviewGuide  === 'function') updatePreviewGuide();
    // Face AR UI / Filter UI を再構築して翻訳を反映
    if (typeof buildFilterUI   === 'function') buildFilterUI();
    if (typeof buildFaceFilterUI === 'function') buildFaceFilterUI();
}

/**
 * 言語切り替えで更新するDOM要素の対応表
 * [セレクタ, i18nキー, 更新対象プロパティ]
 * 'text'      → element.textContent
 * 'placeholder' → element.placeholder
 * 'title'     → element.title
 */
const I18N_DOM_MAP = [
    // ── ヘッダーボタン title ──────────────────────────────────
    ['#filter-toggle',       'header_filter',   'title'],
    ['#face-filter-toggle',  'header_face_ar',  'title'],
    ['#message-toggle',      'header_message',  'title'],
    ['#frame-select-toggle', 'header_frame',    'title'],
    ['#print-settings-toggle','header_print_settings', 'title'],
    ['#switch-camera-btn',   'switch_camera_title', 'title'],

    // -- panel titles --
    ['#filter-selector .panel-header h3',      'filter_panel_title', 'text'],
    ['#face-filter-selector .panel-header h3', 'face_ar_title',      'text'],
    ['#message-editor .panel-header h3',       'msg_panel_title',    'text'],
    ['#frame-selector .panel-header h3',       'frame_panel_title',  'text'],
    ['#print-settings-panel .panel-header h3', 'print_settings_title', 'text'],

    // -- result controls --
    ['#retake-btn',              'retake_btn',   'text'],
    ['#print-btn',               'print_btn',    'text'],
    ['#result-hint',             'save_hint',    'text'],
    ['#retry-btn',               'retry_btn',    'text'],
    ['.result-header-title',     'result_title', 'text'],
    ['#loading-overlay .loading-text', 'camera_loading', 'text'],
    ['#error-text',              'error_camera', 'text'],

    // -- message editor --
    ['label[for="message-date"]',     'msg_date_label',     'text'],
    ['label[for="message-text"]',     'msg_text_label',     'text'],
    ['label[for="message-location"]', 'msg_location_label', 'text'],
    ['#message-apply',                'msg_apply',          'text'],
];

/**
 * 翻訳を全 DOM 要素に適用する
 * ① I18N_DOM_MAP の対応表で既知要素を直接更新
 * ② [data-i18n] 属性があれば追加で更新（省略可能）
 */
function applyTranslations() {
    // ① 対応表ベース更新
    I18N_DOM_MAP.forEach(([selector, key, prop]) => {
        document.querySelectorAll(selector).forEach(el => {
            const val = t(key);
            if (!val) return;
            if (prop === 'text')        el.textContent = val;
            else if (prop === 'placeholder') el.placeholder = val;
            else if (prop === 'title')  el.title = val;
            else if (prop === 'value')  el.value = val;
        });
    });

    // ② data-i18n 属性ベース更新（あれば）
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (!val) return;
        const tag  = el.tagName;
        const type = el.type;
        if ((tag === 'INPUT' || tag === 'TEXTAREA') && (type === 'text' || type === 'password' || type === 'search')) {
            el.placeholder = val;
        } else if (tag === 'INPUT' && type === 'submit') {
            el.value = val;
        } else {
            el.textContent = val;
        }
    });
}

/**
 * 言語選択 UI を生成してヘッダーに追加する
 * @param {string} containerId - 追加先要素の ID
 */
function buildLanguageSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const LANG_OPTIONS = [
        { code: 'ja',    label: '日本語' },
        { code: 'en',    label: 'English' },
        { code: 'zh',    label: '简体中文' },
        { code: 'zh-TW', label: '繁體中文' },
        { code: 'ko',    label: '한국어' },
        { code: 'fr',    label: 'Français' },
        { code: 'es',    label: 'Español' },
        { code: 'de',    label: 'Deutsch' },
        { code: 'pt',    label: 'Português' },
    ];

    const wrapper = document.createElement('div');
    wrapper.className = 'lang-selector-wrap';

    const btn = document.createElement('button');
    btn.className = 'lang-selector-btn hdr-btn';
    btn.title = t('lang_select');
    btn.innerHTML = '🌐';

    const dropdown = document.createElement('div');
    dropdown.className = 'lang-dropdown hidden';

    LANG_OPTIONS.forEach(opt => {
        const item = document.createElement('button');
        item.className = 'lang-option' + (opt.code === currentLang ? ' active' : '');
        item.textContent = opt.label;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            setLanguage(opt.code);
            dropdown.querySelectorAll('.lang-option').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            dropdown.classList.add('hidden');
        });
        dropdown.appendChild(item);
    });

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => dropdown.classList.add('hidden'));

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);
    // ページ読み込み時に保存済み言語を即時適用
    applyTranslations();
}
