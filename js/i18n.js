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
        // ログイン画面
        login_title:        '品川プリンスホテル フォト',
        login_subtitle:     '特別な記念日を、思い出の一枚に',
        login_password_placeholder: 'パスワードを入力',
        login_btn:          'ログイン',
        login_error:        'パスワードが違います',
        login_error_empty:  'パスワードを入力してください',
        login_qr_hint:      '各レストランのQRコードをスキャンしてください',

        // カメラ画面ヘッダー
        header_filter:      '写真フィルター',
        header_face_ar:     'Face ARデコレーション',
        header_message:     'メッセージ編集',
        header_frame:       'フレーム選択',

        // 撮影コントロール
        capture_btn:        '📷',
        retake_btn:         '再撮影',
        save_btn:           '保存する',
        saving_btn:         '保存中...',

        // メッセージエディタ
        msg_panel_title:    '表示メッセージ',
        msg_date_label:     '日付',
        msg_text_label:     'メッセージ',
        msg_location_label: '場所',
        msg_show:           '表示',
        msg_apply:          '適用',
        msg_font_label:     '書体',
        msg_size_label:     'サイズ',
        msg_pos_label:      '位置',
        msg_size_sm:        '小',
        msg_size_md:        '中',
        msg_size_lg:        '大',
        msg_pos_tl:         '上・左',
        msg_pos_tc:         '上・中央',
        msg_pos_tr:         '上・右',
        msg_pos_bl:         '下・左',
        msg_pos_bc:         '下・中央',
        msg_pos_br:         '下・右',
        msg_default_text:   'お誕生日おめでとうございます',
        msg_edit_location:  '編集',

        // フィルター / デコレーション
        filter_panel_title: '写真フィルター',
        face_ar_title:      'Face AR デコレーション',
        frame_panel_title:  'フレームを選択',
        intensity_label:    '強度',
        preview_guide_hint: 'フレーム内に収まるよう調整してください',

        // フレームデコレーション「なし」
        frame_none:         'なし',

        // 結果画面
        result_title:       '撮影完了',
        save_hint:          '写真を長押しで「カメラロールに保存」／「保存する」ボタン→「写真に保存」を選択',

        // 共通
        close:              '✕',
        loading:            '読み込み中...',
        error_camera:       'カメラが起動できませんでした',
        error_save:         '保存に失敗しました。もう一度お試しください。',
        lang_select:        '言語',

        // カテゴリー
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
        logout_title:           'ログアウト',
        login_password_label:   'パスワード',
        login_hotel_tagline:    '記念日フォトフレーム',
        camera_loading:         'カメラを起動中...',
    },

    // ================================================================
    // English
    // ================================================================
    en: {
        login_title:        'Shinagawa Prince Hotel Photo',
        login_subtitle:     'Turn your special occasion into a precious memory',
        login_password_placeholder: 'Enter password',
        login_btn:          'Login',
        login_error:        'Incorrect password',
        login_error_empty:  'Please enter your password',
        login_qr_hint:      'Please scan the QR code at your restaurant',

        header_filter:      'Photo Filter',
        header_face_ar:     'Face AR Decoration',
        header_message:     'Edit Message',
        header_frame:       'Select Frame',

        capture_btn:        '📷',
        retake_btn:         'Retake',
        save_btn:           'Save Photo',
        saving_btn:         'Saving...',

        msg_panel_title:    'Anniversary Message',
        msg_date_label:     'Date',
        msg_text_label:     'Message',
        msg_location_label: 'Location',
        msg_show:           'Show',
        msg_apply:          'Apply',
        msg_font_label:     'Font',
        msg_size_label:     'Size',
        msg_pos_label:      'Position',
        msg_size_sm:        'Small',
        msg_size_md:        'Medium',
        msg_size_lg:        'Large',
        msg_pos_tl:         'Top Left',
        msg_pos_tc:         'Top Center',
        msg_pos_tr:         'Top Right',
        msg_pos_bl:         'Bottom Left',
        msg_pos_bc:         'Bottom Center',
        msg_pos_br:         'Bottom Right',
        msg_default_text:   'Happy Anniversary!',
        msg_edit_location:  'Edit',

        filter_panel_title: 'Photo Filter',
        face_ar_title:      'Face AR Decoration',
        frame_panel_title:  'Select Frame',
        intensity_label:    'Intensity',
        preview_guide_hint: 'Position yourself within the frame',

        frame_none:         'None',
        result_title:       'Photo Taken',
        save_hint:          'Long-press photo to save / Tap "Save Photo" → "Save Image"',

        close:              '✕',
        loading:            'Loading...',
        error_camera:       'Could not start the camera',
        error_save:         'Failed to save. Please try again.',
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
        logout_title:           'Logout',
        login_password_label:   'Password',
        login_hotel_tagline:    'Anniversary Photo Frame',
        camera_loading:         'Starting camera...',
    },

    // ================================================================
    // 简体中文
    // ================================================================
    zh: {
        login_title:        '品川王子大饭店 照片',
        login_subtitle:     '将您的特别纪念日化为珍贵回忆',
        login_password_placeholder: '请输入密码',
        login_btn:          '登录',
        login_error:        '密码错误',
        login_error_empty:  '请输入密码',
        login_qr_hint:      '请扫描餐厅的二维码',

        header_filter:      '照片滤镜',
        header_face_ar:     'Face AR 装饰',
        header_message:     '编辑留言',
        header_frame:       '选择边框',

        capture_btn:        '📷',
        retake_btn:         '重新拍摄',
        save_btn:           '保存照片',
        saving_btn:         '保存中...',

        msg_panel_title:    '纪念留言',
        msg_date_label:     '日期',
        msg_text_label:     '留言',
        msg_location_label: '地点',
        msg_show:           '显示',
        msg_apply:          '应用',
        msg_font_label:     '字体',
        msg_size_label:     '大小',
        msg_pos_label:      '位置',
        msg_size_sm:        '小',
        msg_size_md:        '中',
        msg_size_lg:        '大',
        msg_pos_tl:         '左上',
        msg_pos_tc:         '上方居中',
        msg_pos_tr:         '右上',
        msg_pos_bl:         '左下',
        msg_pos_bc:         '下方居中',
        msg_pos_br:         '右下',
        msg_default_text:   '纪念日快乐！',
        msg_edit_location:  '编辑',

        filter_panel_title: '照片滤镜',
        face_ar_title:      'Face AR 装饰',
        frame_panel_title:  '选择边框',
        intensity_label:    '强度',
        preview_guide_hint: '请调整位置以适应边框',

        frame_none:         '无',
        result_title:       '拍摄完成',
        save_hint:          '长按照片可保存 / 点击"保存照片"→"存储图像"',

        close:              '✕',
        loading:            '加载中...',
        error_camera:       '无法启动摄像头',
        error_save:         '保存失败，请重试。',
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
        logout_title:           '退出登录',
        login_password_label:   '密码',
        login_hotel_tagline:    '纪念日相框',
        camera_loading:         '正在启动摄像头...',
    },

    // ================================================================
    // 繁體中文
    // ================================================================
    'zh-TW': {
        login_title:        '品川王子大飯店 照片',
        login_subtitle:     '將您的特別紀念日化為珍貴回憶',
        login_password_placeholder: '請輸入密碼',
        login_btn:          '登入',
        login_error:        '密碼錯誤',
        login_error_empty:  '請輸入密碼',
        login_qr_hint:      '請掃描餐廳的QR碼',

        header_filter:      '相片濾鏡',
        header_face_ar:     'Face AR 裝飾',
        header_message:     '編輯留言',
        header_frame:       '選擇邊框',

        capture_btn:        '📷',
        retake_btn:         '重新拍攝',
        save_btn:           '儲存照片',
        saving_btn:         '儲存中...',

        msg_panel_title:    '紀念留言',
        msg_date_label:     '日期',
        msg_text_label:     '留言',
        msg_location_label: '地點',
        msg_show:           '顯示',
        msg_apply:          '套用',
        msg_font_label:     '字型',
        msg_size_label:     '大小',
        msg_pos_label:      '位置',
        msg_size_sm:        '小',
        msg_size_md:        '中',
        msg_size_lg:        '大',
        msg_pos_tl:         '左上',
        msg_pos_tc:         '上方置中',
        msg_pos_tr:         '右上',
        msg_pos_bl:         '左下',
        msg_pos_bc:         '下方置中',
        msg_pos_br:         '右下',
        msg_default_text:   '紀念日快樂！',
        msg_edit_location:  '編輯',

        filter_panel_title: '相片濾鏡',
        face_ar_title:      'Face AR 裝飾',
        frame_panel_title:  '選擇邊框',
        intensity_label:    '強度',
        preview_guide_hint: '請調整位置以配合框架',

        frame_none:         '無',
        result_title:       '拍攝完成',
        save_hint:          '長按照片可儲存 / 點擊「儲存照片」→「儲存影像」',

        close:              '✕',
        loading:            '載入中...',
        error_camera:       '無法啟動攝影機',
        error_save:         '儲存失敗，請重試。',
        lang_select:        '語言',

        cat_none:           '無',
        cat_head:           '頭部 / 帽子',
        cat_eyes:           '眼部',
        cat_nose:           '鼻部',
        cat_mouth:          '口部',
        cat_face:           '全臉',
        cat_animal:         '動物變身',
        cat_seasonal:       '節日 / 活動',
        cat_accessory:      '配件',

        retry_btn:              '重試',
        switch_camera_title:    '切換攝影機',
        logout_title:           '登出',
        login_password_label:   '密碼',
        login_hotel_tagline:    '紀念日相框',
        camera_loading:         '正在啟動攝影機...',
    },

    // ================================================================
    // 한국어
    // ================================================================
    ko: {
        login_title:        '시나가와 프린스 호텔 포토',
        login_subtitle:     '특별한 기념일을 소중한 추억으로',
        login_password_placeholder: '비밀번호를 입력하세요',
        login_btn:          '로그인',
        login_error:        '비밀번호가 틀렸습니다',
        login_error_empty:  '비밀번호를 입력해 주세요',
        login_qr_hint:      '레스토랑 QR 코드를 스캔해 주세요',

        header_filter:      '사진 필터',
        header_face_ar:     'Face AR 데코레이션',
        header_message:     '메시지 편집',
        header_frame:       '프레임 선택',

        capture_btn:        '📷',
        retake_btn:         '다시 찍기',
        save_btn:           '저장',
        saving_btn:         '저장 중...',

        msg_panel_title:    '기념일 메시지',
        msg_date_label:     '날짜',
        msg_text_label:     '메시지',
        msg_location_label: '장소',
        msg_show:           '표시',
        msg_apply:          '적용',
        msg_font_label:     '글꼴',
        msg_size_label:     '크기',
        msg_pos_label:      '위치',
        msg_size_sm:        '소',
        msg_size_md:        '중',
        msg_size_lg:        '대',
        msg_pos_tl:         '왼쪽 위',
        msg_pos_tc:         '위 중앙',
        msg_pos_tr:         '오른쪽 위',
        msg_pos_bl:         '왼쪽 아래',
        msg_pos_bc:         '아래 중앙',
        msg_pos_br:         '오른쪽 아래',
        msg_default_text:   '기념일을 축하합니다!',
        msg_edit_location:  '편집',

        filter_panel_title: '사진 필터',
        face_ar_title:      'Face AR 데코레이션',
        frame_panel_title:  '프레임 선택',
        intensity_label:    '강도',
        preview_guide_hint: '프레임 내에 맞게 조정하세요',

        frame_none:         '없음',
        result_title:       '촬영 완료',
        save_hint:          '사진 길게 눌러 저장 / "저장" 버튼 → "이미지 저장" 선택',

        close:              '✕',
        loading:            '로딩 중...',
        error_camera:       '카메라를 시작할 수 없습니다',
        error_save:         '저장에 실패했습니다. 다시 시도해 주세요.',
        lang_select:        '언어',

        cat_none:           '없음',
        cat_head:           '머리 / 모자',
        cat_eyes:           '눈 주변',
        cat_nose:           '코 주변',
        cat_mouth:          '입 주변',
        cat_face:           '얼굴 전체',
        cat_animal:         '동물 변신',
        cat_seasonal:       '계절 / 이벤트',
        cat_accessory:      '액세서리',

        retry_btn:              '다시 시도',
        switch_camera_title:    '카메라 전환',
        logout_title:           '로그아웃',
        login_password_label:   '비밀번호',
        login_hotel_tagline:    '기념일 포토 프레임',
        camera_loading:         '카메라 시작 중...',
    },

    // ================================================================
    // Français
    // ================================================================
    fr: {
        login_title:        'Photo Shinagawa Prince Hotel',
        login_subtitle:     'Transformez votre anniversaire en un souvenir précieux',
        login_password_placeholder: 'Entrez le mot de passe',
        login_btn:          'Connexion',
        login_error:        'Mot de passe incorrect',
        login_error_empty:  'Veuillez saisir votre mot de passe',
        login_qr_hint:      'Veuillez scanner le QR code de votre restaurant',

        header_filter:      'Filtre Photo',
        header_face_ar:     'Décoration Face AR',
        header_message:     'Modifier le message',
        header_frame:       'Choisir un cadre',

        capture_btn:        '📷',
        retake_btn:         'Reprendre',
        save_btn:           'Enregistrer',
        saving_btn:         'Enregistrement...',

        msg_panel_title:    'Message d\'anniversaire',
        msg_date_label:     'Date',
        msg_text_label:     'Message',
        msg_location_label: 'Lieu',
        msg_show:           'Afficher',
        msg_apply:          'Appliquer',
        msg_font_label:     'Police',
        msg_size_label:     'Taille',
        msg_pos_label:      'Position',
        msg_size_sm:        'Petit',
        msg_size_md:        'Moyen',
        msg_size_lg:        'Grand',
        msg_pos_tl:         'Haut Gauche',
        msg_pos_tc:         'Haut Centre',
        msg_pos_tr:         'Haut Droite',
        msg_pos_bl:         'Bas Gauche',
        msg_pos_bc:         'Bas Centre',
        msg_pos_br:         'Bas Droite',
        msg_default_text:   'Joyeux anniversaire !',
        msg_edit_location:  'Modifier',

        filter_panel_title: 'Filtre Photo',
        face_ar_title:      'Décoration Face AR',
        frame_panel_title:  'Choisir un cadre',
        intensity_label:    'Intensité',
        preview_guide_hint: 'Ajustez votre position dans le cadre',

        frame_none:         'Aucun',
        result_title:       'Photo prise',
        save_hint:          'Appui long sur la photo pour sauvegarder / Bouton "Enregistrer" → "Enregistrer l\'image"',

        close:              '✕',
        loading:            'Chargement...',
        error_camera:       'Impossible de démarrer la caméra',
        error_save:         'Échec de la sauvegarde. Veuillez réessayer.',
        lang_select:        'Langue',

        cat_none:           'Aucun',
        cat_head:           'Tête / Chapeau',
        cat_eyes:           'Yeux',
        cat_nose:           'Nez',
        cat_mouth:          'Bouche',
        cat_face:           'Visage entier',
        cat_animal:         'Transformation animale',
        cat_seasonal:       'Saisonnier / Événements',
        cat_accessory:      'Accessoires',

        retry_btn:              'Réessayer',
        switch_camera_title:    'Changer de caméra',
        logout_title:           'Déconnexion',
        login_password_label:   'Mot de passe',
        login_hotel_tagline:    'Cadre photo anniversaire',
        camera_loading:         'Démarrage de la caméra...',
    },

    // ================================================================
    // Español
    // ================================================================
    es: {
        login_title:        'Foto Shinagawa Prince Hotel',
        login_subtitle:     'Convierte tu aniversario en un recuerdo especial',
        login_password_placeholder: 'Introduzca la contraseña',
        login_btn:          'Iniciar sesión',
        login_error:        'Contraseña incorrecta',
        login_error_empty:  'Por favor ingrese su contraseña',
        login_qr_hint:      'Escanea el código QR de tu restaurante',

        header_filter:      'Filtro de foto',
        header_face_ar:     'Decoración Face AR',
        header_message:     'Editar mensaje',
        header_frame:       'Seleccionar marco',

        capture_btn:        '📷',
        retake_btn:         'Volver a tomar',
        save_btn:           'Guardar foto',
        saving_btn:         'Guardando...',

        msg_panel_title:    'Mensaje de aniversario',
        msg_date_label:     'Fecha',
        msg_text_label:     'Mensaje',
        msg_location_label: 'Lugar',
        msg_show:           'Mostrar',
        msg_apply:          'Aplicar',
        msg_font_label:     'Fuente',
        msg_size_label:     'Tamaño',
        msg_pos_label:      'Posición',
        msg_size_sm:        'Pequeño',
        msg_size_md:        'Mediano',
        msg_size_lg:        'Grande',
        msg_pos_tl:         'Arriba izq.',
        msg_pos_tc:         'Arriba centro',
        msg_pos_tr:         'Arriba der.',
        msg_pos_bl:         'Abajo izq.',
        msg_pos_bc:         'Abajo centro',
        msg_pos_br:         'Abajo der.',
        msg_default_text:   '¡Feliz aniversario!',
        msg_edit_location:  'Editar',

        filter_panel_title: 'Filtro de foto',
        face_ar_title:      'Decoración Face AR',
        frame_panel_title:  'Seleccionar marco',
        intensity_label:    'Intensidad',
        preview_guide_hint: 'Ajuste su posición dentro del marco',

        frame_none:         'Ninguno',
        result_title:       'Foto tomada',
        save_hint:          'Mantén pulsada la foto para guardar / Botón "Guardar" → "Guardar imagen"',

        close:              '✕',
        loading:            'Cargando...',
        error_camera:       'No se puede iniciar la cámara',
        error_save:         'Error al guardar. Inténtalo de nuevo.',
        lang_select:        'Idioma',

        cat_none:           'Ninguno',
        cat_head:           'Cabeza / Sombrero',
        cat_eyes:           'Ojos',
        cat_nose:           'Nariz',
        cat_mouth:          'Boca',
        cat_face:           'Cara completa',
        cat_animal:         'Transformación animal',
        cat_seasonal:       'Temporada / Eventos',
        cat_accessory:      'Accesorios',

        retry_btn:              'Reintentar',
        switch_camera_title:    'Cambiar cámara',
        logout_title:           'Cerrar sesión',
        login_password_label:   'Contraseña',
        login_hotel_tagline:    'Marco fotográfico de aniversario',
        camera_loading:         'Iniciando cámara...',
    },

    // ================================================================
    // Deutsch
    // ================================================================
    de: {
        login_title:        'Shinagawa Prince Hotel Foto',
        login_subtitle:     'Verwandle deinen besonderen Anlass in ein bleibendes Erinnerungsbild',
        login_password_placeholder: 'Passwort eingeben',
        login_btn:          'Anmelden',
        login_error:        'Falsches Passwort',
        login_error_empty:  'Bitte Passwort eingeben',
        login_qr_hint:      'Bitte den QR-Code Ihres Restaurants scannen',

        header_filter:      'Fotofilter',
        header_face_ar:     'Face-AR-Dekoration',
        header_message:     'Nachricht bearbeiten',
        header_frame:       'Rahmen wählen',

        capture_btn:        '📷',
        retake_btn:         'Neu aufnehmen',
        save_btn:           'Foto speichern',
        saving_btn:         'Speichern...',

        msg_panel_title:    'Jubiläumsnachricht',
        msg_date_label:     'Datum',
        msg_text_label:     'Nachricht',
        msg_location_label: 'Ort',
        msg_show:           'Anzeigen',
        msg_apply:          'Anwenden',
        msg_font_label:     'Schriftart',
        msg_size_label:     'Größe',
        msg_pos_label:      'Position',
        msg_size_sm:        'Klein',
        msg_size_md:        'Mittel',
        msg_size_lg:        'Groß',
        msg_pos_tl:         'Oben links',
        msg_pos_tc:         'Oben Mitte',
        msg_pos_tr:         'Oben rechts',
        msg_pos_bl:         'Unten links',
        msg_pos_bc:         'Unten Mitte',
        msg_pos_br:         'Unten rechts',
        msg_default_text:   'Alles Gute zum Jahrestag!',
        msg_edit_location:  'Bearbeiten',

        filter_panel_title: 'Fotofilter',
        face_ar_title:      'Face-AR-Dekoration',
        frame_panel_title:  'Rahmen wählen',
        intensity_label:    'Intensität',
        preview_guide_hint: 'Positionieren Sie sich im Rahmen',

        frame_none:         'Keiner',
        result_title:       'Foto aufgenommen',
        save_hint:          'Lang drücken zum Speichern / Taste "Foto speichern" → "Bild speichern"',

        close:              '✕',
        loading:            'Laden...',
        error_camera:       'Kamera konnte nicht gestartet werden',
        error_save:         'Speichern fehlgeschlagen. Bitte erneut versuchen.',
        lang_select:        'Sprache',

        cat_none:           'Keiner',
        cat_head:           'Kopf / Hut',
        cat_eyes:           'Augen',
        cat_nose:           'Nase',
        cat_mouth:          'Mund',
        cat_face:           'Ganzes Gesicht',
        cat_animal:         'Tierverwandlung',
        cat_seasonal:       'Saisonal / Events',
        cat_accessory:      'Accessoires',

        retry_btn:              'Wiederholen',
        switch_camera_title:    'Kamera wechseln',
        logout_title:           'Abmelden',
        login_password_label:   'Passwort',
        login_hotel_tagline:    'Jubiläums-Fotorahmen',
        camera_loading:         'Kamera wird gestartet...',
    },

    // ================================================================
    // Português
    // ================================================================
    pt: {
        login_title:        'Foto Shinagawa Prince Hotel',
        login_subtitle:     'Transforme o seu aniversário especial numa recordação preciosa',
        login_password_placeholder: 'Introduza a senha',
        login_btn:          'Entrar',
        login_error:        'Senha incorreta',
        login_error_empty:  'Por favor, insira sua senha',
        login_qr_hint:      'Por favor, digitalize o QR code do seu restaurante',

        header_filter:      'Filtro de foto',
        header_face_ar:     'Decoração Face AR',
        header_message:     'Editar mensagem',
        header_frame:       'Selecionar moldura',

        capture_btn:        '📷',
        retake_btn:         'Tirar novamente',
        save_btn:           'Guardar foto',
        saving_btn:         'A guardar...',

        msg_panel_title:    'Mensagem de aniversário',
        msg_date_label:     'Data',
        msg_text_label:     'Mensagem',
        msg_location_label: 'Local',
        msg_show:           'Mostrar',
        msg_apply:          'Aplicar',
        msg_font_label:     'Tipo de letra',
        msg_size_label:     'Tamanho',
        msg_pos_label:      'Posição',
        msg_size_sm:        'Pequeno',
        msg_size_md:        'Médio',
        msg_size_lg:        'Grande',
        msg_pos_tl:         'Cima esq.',
        msg_pos_tc:         'Cima centro',
        msg_pos_tr:         'Cima dir.',
        msg_pos_bl:         'Baixo esq.',
        msg_pos_bc:         'Baixo centro',
        msg_pos_br:         'Baixo dir.',
        msg_default_text:   'Feliz aniversário!',
        msg_edit_location:  'Editar',

        filter_panel_title: 'Filtro de foto',
        face_ar_title:      'Decoração Face AR',
        frame_panel_title:  'Selecionar moldura',
        intensity_label:    'Intensidade',
        preview_guide_hint: 'Ajuste sua posição dentro da moldura',

        frame_none:         'Nenhum',
        result_title:       'Foto tirada',
        save_hint:          'Pressione e segure a foto para guardar / Botão "Guardar foto" → "Guardar imagem"',

        close:              '✕',
        loading:            'A carregar...',
        error_camera:       'Não foi possível iniciar a câmara',
        error_save:         'Falha ao guardar. Tente novamente.',
        lang_select:        'Idioma',

        cat_none:           'Nenhum',
        cat_head:           'Cabeça / Chapéu',
        cat_eyes:           'Olhos',
        cat_nose:           'Nariz',
        cat_mouth:          'Boca',
        cat_face:           'Rosto inteiro',
        cat_animal:         'Transformação animal',
        cat_seasonal:       'Sazonal / Eventos',
        cat_accessory:      'Acessórios',

        retry_btn:              'Tentar novamente',
        switch_camera_title:    'Trocar câmera',
        logout_title:           'Sair',
        login_password_label:   'Senha',
        login_hotel_tagline:    'Quadro de foto de aniversário',
        camera_loading:         'Iniciando câmera...',
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

/**
 * 言語を切り替えて全 UI に再適用する
 * @param {string} lang - 言語コード（'ja','en','zh','zh-TW','ko','fr','es','de','pt'）
 */
function setLanguage(lang) {
    if (!I18N_TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem('sph_lang', lang);
    applyTranslations();
    // デフォルトメッセージ文字列を言語に合わせて更新
    const msgInput = document.getElementById('message-text');
    if (msgInput && typeof messageConfig !== 'undefined') {
        const newDefault = t('msg_default_text');
        msgInput.value = newDefault;
        messageConfig.text.value = newDefault;
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
    ['#switch-camera-btn',   'switch_camera_title', 'title'],
    ['#logout-btn',          'logout_title',    'title'],

    // ── パネルタイトル (h3) ───────────────────────────────────
    ['#filter-selector .panel-header h3',      'filter_panel_title', 'text'],
    ['#face-filter-selector .panel-header h3', 'face_ar_title',      'text'],
    ['#message-editor .panel-header h3',       'msg_panel_title',    'text'],
    ['#frame-selector .panel-header h3',       'frame_panel_title',  'text'],

    // ── 撮影・結果ボタン・ラベル ───────────────────────────────
    ['#retake-btn',              'retake_btn',   'text'],
    ['#download-btn',            'save_btn',     'text'],
    ['#retry-btn',               'retry_btn',    'text'],
    ['.result-header-title',     'result_title', 'text'],
    ['#loading-overlay .loading-text', 'camera_loading', 'text'],
    ['#error-text',              'error_camera', 'text'],

    // ── メッセージエディタ label ──────────────────────────────
    ['label[for="message-date"]',     'msg_date_label',     'text'],
    ['label[for="message-text"]',     'msg_text_label',     'text'],
    ['label[for="message-location"]', 'msg_location_label', 'text'],
    ['#message-apply',                'msg_apply',          'text'],

    // ── ログイン画面 ──────────────────────────────────────────
    ['#password-input',            'login_password_placeholder', 'placeholder'],
    ['#login-btn',                 'login_btn',                  'text'],
    ['.login-qr-hint',             'login_qr_hint',              'text'],
    ['label[for="password-input"]','login_password_label',       'text'],
    ['.login-hotel-tagline',       'login_hotel_tagline',        'text'],
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
