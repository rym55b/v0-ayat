// Attendre que le document soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const verseInput = document.getElementById('verse');
    const imageInput = document.getElementById('image');
    const createBtn = document.getElementById('createBtn');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');
    
    // Variable pour stocker l'instance FFmpeg
    let ffmpeg = null;
    
    // Fonction pour charger FFmpeg
    async function loadFFmpeg() {
        try {
            statusDiv.innerHTML = 'جاري تحميل المكتبات...';
            statusDiv.className = 'status';
            
            // Créer une nouvelle instance FFmpeg
            ffmpeg = new FFmpeg();
            
            // Configurer FFmpeg pour utiliser les WebAssembly
            ffmpeg.setLogger(({ message }) => {
                console.log(message);
            });
            
            // Charger FFmpeg
            await ffmpeg.load();
            
            statusDiv.innerHTML = 'تم تحميل المكتبات بنجاح';
            createBtn.disabled = false;
            
            return true;
        } catch (error) {
            console.error('Error loading FFmpeg:', error);
            statusDiv.innerHTML = 'خطأ في تحميل المكتبات: ' + error.message;
            statusDiv.className = 'status error';
            return false;
        }
    }
    
    // Fonction pour créer la vidéo
    async function createVideo() {
        // Vérifier si les entrées sont valides
        if (!verseInput.value.trim()) {
            statusDiv.innerHTML = 'الرجاء إدخال الآية';
            statusDiv.className = 'status error';
            return;
        }
        
        if (!imageInput.files || imageInput.files.length === 0) {
            statusDiv.innerHTML = 'الرجاء اختيار صورة';
            statusDiv.className = 'status error';
            return;
        }
        
        try {
            // Désactiver le bouton pendant le traitement
            createBtn.disabled = true;
            createBtn.innerHTML = '<span class="loading"></span> جاري الإنشاء...';
            
            // Charger FFmpeg si ce n'est pas déjà fait
            if (!ffmpeg || !ffmpeg.isLoaded()) {
                const loaded = await loadFFmpeg();
                if (!loaded) {
                    createBtn.disabled = false;
                    createBtn.innerHTML = 'إنشاء الفيديو';
                    return;
                }
            }
            
            statusDiv.innerHTML = 'جاري معالجة الصورة...';
            
            // Lire le fichier image
            const imageFile = imageInput.files[0];
            const imageArrayBuffer = await imageFile.arrayBuffer();
            const imageUint8Array = new Uint8Array(imageArrayBuffer);
            
            // Écrire l'image dans le système de fichiers virtuel de FFmpeg
            ffmpeg.FS('writeFile', 'input.jpg', imageUint8Array);
            
            // Créer un fichier texte avec le verset
            const verse = verseInput.value.trim();
            ffmpeg.FS('writeFile', 'verse.txt', new TextEncoder().encode(verse));
            
            statusDiv.innerHTML = 'جاري إنشاء الفيديو...';
            
            // Exécuter la commande FFmpeg pour créer une vidéo à partir de l'image
            // avec le texte superposé
            await ffmpeg.run(
                '-loop', '1',
                '-i', 'input.jpg',
                '-vf', `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile=verse.txt:fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=(h-text_h)/2`,
                '-t', '10',
                '-pix_fmt', 'yuv420p',
                '-vcodec', 'libx264',
                'output.mp4'
            );
            
            // Lire le fichier vidéo généré
            const data = ffmpeg.FS('readFile', 'output.mp4');
            
            // Créer un blob à partir des données
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            
            // Afficher la vidéo et le lien de téléchargement
            resultDiv.innerHTML = `
                <video controls width="100%" src="${url}"></video>
                <a href="${url}" download="quran_verse_video.mp4" class="download-btn">تحميل الفيديو</a>
            `;
            
            statusDiv.innerHTML = 'تم إنشاء الفيديو بنجاح!';
            statusDiv.className = 'status success';
            
        } catch (error) {
            console.error('Error creating video:', error);
            statusDiv.innerHTML = 'خطأ في إنشاء الفيديو: ' + error.message;
            statusDiv.className = 'status error';
        } finally {
            // Réactiver le bouton
            createBtn.disabled = false;
            createBtn.innerHTML = 'إنشاء الفيديو';
        }
    }
    
    // Ajouter un écouteur d'événement au bouton
    createBtn.addEventListener('click', createVideo);
    
    // Charger FFmpeg au démarrage
    loadFFmpeg();
});
