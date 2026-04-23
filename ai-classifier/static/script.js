document.addEventListener('DOMContentLoaded', () => {
    const productNameInput = document.getElementById('product-name');
    const tagInput = document.getElementById('tag-input');
    const tagsContainer = document.getElementById('tags-container');
    const classifyBtn = document.getElementById('classify-btn');
    const resultArea = document.getElementById('result-area');
    const topCategoryName = document.getElementById('top-category-name');
    const scoresList = document.getElementById('scores-list');

    let categories = ['Sembako', 'Elektronik', 'Kesehatan', 'Kecantikan'];

    // Initial tags
    function renderTags() {
        // Clear all except input
        const tagElements = tagsContainer.querySelectorAll('.tag');
        tagElements.forEach(el => el.remove());

        categories.forEach((cat, index) => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `
                <span>${cat}</span>
                <i data-lucide="x" onclick="removeTag(${index})"></i>
            `;
            tagsContainer.insertBefore(tag, tagInput);
        });
        lucide.createIcons();
    }

    window.removeTag = (index) => {
        categories.splice(index, 1);
        renderTags();
    };

    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && tagInput.value.trim() !== '') {
            e.preventDefault();
            const newCat = tagInput.value.trim();
            if (!categories.includes(newCat)) {
                categories.push(newCat);
                renderTags();
            }
            tagInput.value = '';
        }
    });

    classifyBtn.addEventListener('click', async () => {
        const productName = productNameInput.value.trim();
        if (!productName) {
            productNameInput.focus();
            return;
        }

        if (categories.length === 0) {
            alert('Tambahkan setidaknya satu kategori!');
            tagInput.focus();
            return;
        }

        // Loading state
        classifyBtn.disabled = true;
        classifyBtn.innerHTML = `
            <div class="spinner"></div>
            <span>Menganalisa...</span>
        `;
        
        try {
            const response = await fetch('/api/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: productName,
                    labels: categories
                })
            });

            const data = await response.json();

            if (response.ok) {
                renderResults(data);
            } else {
                alert('Error: ' + data.detail);
            }
        } catch (error) {
            console.error('API Error:', error);
            alert('Gagal menghubungi server AI. Pastikan backend sudah running.');
        } finally {
            classifyBtn.disabled = false;
            classifyBtn.innerHTML = `
                <span>Mulai Klasifikasi</span>
                <i data-lucide="cpu"></i>
            `;
            lucide.createIcons();
        }
    });

    function renderResults(data) {
        resultArea.style.display = 'block';
        topCategoryName.innerText = data.best_match;
        
        scoresList.innerHTML = '';
        
        // Results are already sorted by score from the backend zero-shot pipeline
        data.labels.forEach((label, i) => {
            const score = data.scores[i];
            const percentage = Math.round(score * 100);
            
            const item = document.createElement('div');
            item.className = 'score-item';
            item.innerHTML = `
                <div class="score-header">
                    <span class="category-name">${label}</span>
                    <span class="percentage">${percentage}%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: 0%; ${i === 0 ? 'background: var(--success);' : ''}"></div>
                </div>
            `;
            scoresList.appendChild(item);

            // Animate after append
            setTimeout(() => {
                item.querySelector('.bar-fill').style.width = percentage + '%';
            }, 50);
        });

        // Scroll to results
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }

    // Initial render
    renderTags();
});
