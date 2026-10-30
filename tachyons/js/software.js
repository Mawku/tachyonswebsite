'use strict';
(() => {
 const button = document.getElementById('download-liveview');
 if (!button) return;
 const status = document.querySelector('.software-download-status');
 const parts = ['downloads/LiveView-1.0-Portable.part1', 'downloads/LiveView-1.0-Portable.part2'];
 const expected = '981c1b6ae510f96f2219e97cbad7b93f09bab9e0a53afeb14797bbf31275fcc8';
 button.addEventListener('click', async () => {
  button.disabled = true;
  status.classList.remove('is-error');
  status.textContent = 'Preparing the download…';
  try {
   const buffers = [];
   for (let i = 0; i < parts.length; i++) {
    const response = await fetch(parts[i] + '?v=' + expected.slice(0, 12));
    if (!response.ok) throw new Error('Download failed');
    buffers.push(await response.arrayBuffer());
    status.textContent = `Preparing the download… ${Math.round((i + 1) / parts.length * 100)}%`;
   }
   const blob = new Blob(buffers, {type: 'application/zip'});
   if (blob.size !== 28227191) throw new Error('Unexpected file size');
   if (crypto.subtle) {
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(n => n.toString(16).padStart(2, '0')).join('');
    if (hash !== expected) throw new Error('Integrity check failed');
   }
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = 'LiveView-1.0-Portable.zip';
   document.body.append(link);
   link.click();
   link.remove();
   setTimeout(() => URL.revokeObjectURL(url), 60000);
   status.textContent = 'Download started.';
  } catch (error) {
   status.classList.add('is-error');
   status.textContent = 'The download could not be prepared. Please check your connection and try again.';
  } finally { button.disabled = false; }
 });
})();
