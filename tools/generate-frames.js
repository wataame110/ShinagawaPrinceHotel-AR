const fs = require('fs');
const { createCanvas } = require('canvas');

const width = 1920;
const height = 1080;

const frames = [
    {
        id: 'frame1',
        name: 'クラシック',
        config: {
            outerWidth: 40,
            outerColor: '#ffffff',
            innerWidth: 30,
            innerColor: '#ffffff',
            innerOffset: 60
        }
    },
    {
        id: 'frame2',
        name: 'ゴールド',
        config: {
            outerWidth: 50,
            outerColor: '#ffd700',
            innerWidth: 35,
            innerColor: '#ffed4e',
            innerOffset: 70
        }
    },
    {
        id: 'frame3',
        name: 'シルバー',
        config: {
            outerWidth: 45,
            outerColor: '#c0c0c0',
            innerWidth: 30,
            innerColor: '#e8e8e8',
            innerOffset: 65
        }
    },
    {
        id: 'frame4',
        name: 'カラフル',
        config: {
            outerWidth: 50,
            outerColor: '#ff6b6b',
            innerWidth: 40,
            innerColor: '#4ecdc4',
            innerOffset: 70
        }
    }
];

function drawFrame(canvas, config) {
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, width, height);
    
    if (config.outerWidth > 0) {
        ctx.strokeStyle = config.outerColor;
        ctx.lineWidth = config.outerWidth;
        ctx.strokeRect(
            config.outerWidth / 2,
            config.outerWidth / 2,
            width - config.outerWidth,
            height - config.outerWidth
        );
    }
    
    if (config.innerWidth > 0 && config.innerOffset) {
        const offset = config.innerOffset;
        ctx.strokeStyle = config.innerColor;
        ctx.lineWidth = config.innerWidth;
        ctx.strokeRect(
            offset + config.innerWidth / 2,
            offset + config.innerWidth / 2,
            width - (offset + config.innerWidth / 2) * 2,
            height - (offset + config.innerWidth / 2) * 2
        );
    }
}

function generateFrames() {
    if (!fs.existsSync('assets')) {
        fs.mkdirSync('assets');
    }
    
    frames.forEach(frame => {
        const canvas = createCanvas(width, height);
        drawFrame(canvas, frame.config);
        
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(`assets/${frame.id}.png`, buffer);
        console.log(`✓ ${frame.name} (${frame.id}.png) を生成しました`);
        
        const thumbCanvas = createCanvas(200, 113);
        const thumbCtx = thumbCanvas.getContext('2d');
        thumbCtx.scale(200 / width, 113 / height);
        drawFrame(thumbCanvas, frame.config);
        
        const thumbBuffer = thumbCanvas.toBuffer('image/png');
        fs.writeFileSync(`assets/${frame.id}-thumb.png`, thumbBuffer);
        console.log(`✓ ${frame.name} サムネイル (${frame.id}-thumb.png) を生成しました`);
    });
    
    console.log('\n全てのフレーム画像が生成されました！');
}

try {
    generateFrames();
} catch (error) {
    console.error('エラーが発生しました:', error.message);
    console.log('\ncanvasパッケージがインストールされていない可能性があります。');
    console.log('以下のコマンドを実行してください:');
    console.log('  npm install canvas');
}
