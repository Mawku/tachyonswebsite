'use strict';
(() => {
  const project = window.TACHYONS_ROBOT_PROJECT;
  if (!project) return;
  document.getElementById('robot-title').textContent = project.name;
  document.getElementById('robot-description').textContent = project.description;
  document.title = `${project.name} — Tachyons`;

  const gallery = document.getElementById('robot-gallery');
  const stage = document.getElementById('robot-gallery-stage');
  const image = document.getElementById('robot-gallery-image');
  const title = document.getElementById('robot-gallery-title');
  const caption = document.getElementById('robot-gallery-caption');
  const counter = document.getElementById('robot-gallery-counter');
  const placeholder = document.getElementById('robot-gallery-placeholder');
  const previous = document.getElementById('robot-gallery-prev');
  const next = document.getElementById('robot-gallery-next');
  const thumbnails = document.getElementById('robot-gallery-thumbnails');
  const photos = Array.isArray(project.gallery) ? project.gallery : [];
  let index = 0;
  const thumbnailButtons = [];

  function showPhoto(position) {
    if (!photos.length) return;
    const update = () => {
    index = (position + photos.length) % photos.length;
    const photo = photos[index];
    image.src = photo.image;
    image.alt = photo.alt || photo.title || 'RoboCup robot';
    title.textContent = photo.title || project.name;
    caption.textContent = photo.caption || '';
    placeholder.hidden = !photo.placeholder;
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
    thumbnailButtons.forEach((button, i) => {
      button.setAttribute('aria-current', String(i === index));
    });
    };
    if (window.TachyonsMotion) window.TachyonsMotion.swapMedia({ stage, image, headings: [title], body: [caption], counter }, update);
    else update();
  }

  photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'robot-gallery-thumbnail';
    button.setAttribute('aria-label', `Show image ${i + 1}: ${photo.title || project.name}`);
    const preview = document.createElement('img');
    preview.src = photo.image;
    preview.alt = '';
    preview.width = 192;
    preview.height = 108;
    preview.loading = 'lazy';
    const label = document.createElement('span');
    label.textContent = photo.title || `Image ${i + 1}`;
    button.append(preview, label);
    button.addEventListener('click', () => showPhoto(i));
    thumbnails.append(button);
    thumbnailButtons.push(button);
  });

  previous.disabled = photos.length < 2;
  next.disabled = photos.length < 2;
  previous.addEventListener('click', () => showPhoto(index - 1));
  next.addEventListener('click', () => showPhoto(index + 1));
  gallery.addEventListener('keydown', event => {
    let position;
    if (event.key === 'ArrowRight') position = index + 1;
    else if (event.key === 'ArrowLeft') position = index - 1;
    else if (event.key === 'Home') position = 0;
    else if (event.key === 'End') position = photos.length - 1;
    else return;
    event.preventDefault();
    showPhoto(position);
  });
  let gesture;
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || event.target.closest('button')) return;
    gesture = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  });
  stage.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = undefined;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      showPhoto(index + (dx < 0 ? 1 : -1));
    }
  });
  stage.addEventListener('pointercancel', () => { gesture = undefined; });
  if (photos.length) showPhoto(0);
  else {
    stage.hidden = true;
    thumbnails.hidden = true;
    counter.hidden = true;
    title.textContent = 'Photos coming soon';
    caption.textContent = 'Images of the robot will appear here as the project develops.';
  }

  const feed = document.getElementById('robot-news-feed');
  const validDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const updates = (Array.isArray(project.updates) ? project.updates : [])
    .filter(update => validDate(update.date))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const fullDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
  const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'Europe/Rome' });
  feed.replaceChildren();
  if (!updates.length) {
    const message = document.createElement('p');
    message.className = 'robot-feed-empty';
    message.textContent = 'The journal is ready. The first project update will appear here soon.';
    feed.append(message);
  }
  updates.forEach(update => {
    const article = document.createElement('article');
    article.className = `robot-news-entry${update.example ? ' is-example' : ''}`;
    const time = document.createElement('time');
    time.dateTime = update.date;
    const date = new Date(`${update.date}T12:00:00Z`);
    time.setAttribute('aria-label', fullDate.format(date));
    const day = document.createElement('span');
    day.className = 'robot-news-day';
    day.textContent = update.date.slice(-2);
    const month = document.createElement('span');
    month.className = 'robot-news-month';
    month.textContent = monthYear.format(date);
    time.append(day, month);
    const content = document.createElement('div');
    content.className = 'robot-news-content';
    const category = document.createElement('p');
    category.className = 'eyebrow robot-news-category';
    category.textContent = update.example ? 'Example entry / ' + (update.category || 'Project') : (update.category || 'Project update');
    const heading = document.createElement('h3');
    heading.textContent = update.title || 'Project update';
    content.append(category, heading);
    const paragraphs = Array.isArray(update.paragraphs) ? update.paragraphs : [];
    paragraphs.forEach(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      content.append(paragraph);
    });
    if (update.image) {
      const photo = document.createElement('img');
      photo.className = 'robot-news-image';
      photo.src = update.image;
      photo.alt = update.alt || update.title || 'Robot project update';
      photo.loading = 'lazy';
      photo.decoding = 'async';
      content.append(photo);
    }
    article.append(time, content);
    feed.append(article);
  });
})();
