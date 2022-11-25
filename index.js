class TwitterSearch {
  constructor() {
    this.setInputElement();
    this.addStyles();
    this.searchBadges = [];
    this.debouncedSearch = debounce(this.fetchSuggestions, 100);
  }

  setInputElement() {
    this.inputEl = replaceForClone(document.querySelector('input[role="combobox"]'));
    this.inputEl.addEventListener('keypress', e => e.stopPropagation());
    this.inputEl.addEventListener('input', this.onSearchInput.bind(this));
    this.inputContainer = this.inputEl.parentElement;
    this.inputContainer.addEventListener('keydown', this.onSearchKeyDown.bind(this));
  }

  onSearchKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      this.handleArrowKey(e);
      return;
    }

    if (e.key === 'Enter') {
      this.handleEnterKey(e);
      return;
    }

    if (e.key === 'Backspace') {
      this.handleBackspaceKey(e);
    }
  }

  handleArrowKey(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const currentIndex = this.userItems.findIndex(item => item.selected);
    let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0) {
      nextIndex = this.userItems.length - 1;
    }

    if (nextIndex > this.userItems.length - 1) {
      nextIndex = 0;
    }

    this.deselectAllUserItems();
    this.userItems[nextIndex].select();
    this.focusedBadge?.setItem(this.userItems[nextIndex]);
  }

  handleEnterKey(e) {
    e.preventDefault();

    if (!this.selectedItem) {
      this.setSearch();
      return;
    };
    this.handleItemSelection(this.selectedItem);
  }

  handleBackspaceKey(e) {
    if (this.inputEl.value === '' && !this.focusedBadge) {
      e.preventDefault();
      e.stopPropagation();
      this.lastBadge?.focus();
    }
  }

  onSearchInput({target : { value }}) {
    let searchQuery = value;

    this.setsuggestionsCont();

    const tokenActivated = ['from', 'to'].some(tokenType => {
      const shouldActivateToken = searchQuery.endsWith(tokenType + ': ') && !this.searchBadges.some(badge => badge.type === tokenType);

      if (shouldActivateToken === false) return false;

      this.addSearchBadge(tokenType);
      this.inputEl.value = '';
      this.inputEl.setAttribute('placeholder', '');
      return true;
    });

    if (tokenActivated === false) {
      this.setSuggestions(searchQuery);
    }
  }

  addSearchBadge(type) {
    const searchBadge = new SearchBadge(type);
    this.renderSearchBadge(searchBadge);
    this.bindSearchBadgeEvents(searchBadge);
    this.searchBadges.push(searchBadge);
    searchBadge.focus();
  }

  renderSearchBadge(searchBadge) {
    if (this.lastBadge) {
      this.lastBadge.element.after(searchBadge.element);
    } else {
      this.inputContainer.prepend(searchBadge.element);
    }
  }

  bindSearchBadgeEvents(searchBadge) {
    searchBadge.on('change', (value) => this.setSuggestions(value));
    searchBadge.on('destroy', () => {
      this.removeSearchBadge(searchBadge);
      this.inputEl.focus();
    });
    searchBadge.on('blur', () => {
      this.inputEl.focus();
      this.clearSuggestions();
    });
  }

  removeSearchBadge(badgeToRemove) {
    this.searchBadges = this.searchBadges.filter(badge => badge !== badgeToRemove);
  }

  async setSuggestions(query) {
    const resJson = await this.debouncedSearch(query);

    this.clearSuggestions();
    this.setUserItems(resJson.users);

    this.userItems.forEach(item => {
      item.highlightQuery(query);
      item.on('click', () => this.handleItemSelection(item));
    });

    this.renderUserItems();
  }

  clearSuggestions() {
    this.suggestionsCont.innerHTML = '';
    this.userItems = [];
  }

  deselectAllUserItems() {
    this.userItems.forEach(item => item.deselect());
  }

  handleItemSelection(item) {
    if (this.focusedBadge) {
      this.focusedBadge.setItem(item);
      this.focusedBadge.blur();
      return;
    }
    this.setSearch();
  }

  renderUserItems() {
    this.suggestionsCont.append(...this.userItems.map(item => item.element));
  }

  setsuggestionsCont() {
    this.suggestionsCont = document.querySelectorAll('div[data-testid="typeaheadEmptySearch"], div#typeaheadDropdown-1, div#typeaheadDropdown-2')[0];
    this.suggestionsCont.style.padding = 0;
    this.suggestionsCont.innerHTML = '';
  }

  async fetchSuggestions(query) {
    const url = 'https://twitter.com/i/api/1.1/search/typeahead.json?include_ext_is_blue_verified=1&src=search_box&result_type=events%2Cusers%2Ctopics&q=';
    const headers = {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.6",
      "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-gpc": "1",
      "x-csrf-token": getCookie('ct0'),
      "x-guest-token": getCookie('gt'),
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en"
    };
    const response = await fetch(url + query, { headers });
    return await response.json();
  }

  setUserItems(users = []) {
    this.userItems = users.map((user) => new UserItem(user));
  }

  addStyles() {  
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
  }

  setSearch() {
    location.href = 'https://twitter.com/search?q=' + this.fullQuery;
  }

  get selectedItem() {
    return this.userItems.find(item => item.selected);
  }

  get focusedBadge() {
    return this.searchBadges.find(badge => badge.focused);
  }

  get lastBadge() {
    return this.searchBadges[this.searchBadges.length - 1];
  }

  get fullQuery() {
    const badgesQuery = this.searchBadges.map(badge => badge.query).join(' ');
    const inputQuery = this.inputEl.value;
    return badgesQuery + ' ' + inputQuery;
  }
}

class EventEmiter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }

  off() {
    this.events = {};
  }
}

class SearchBadge extends EventEmiter {
  constructor(type) {
    super();
    this.type = type;
    this.element = this.createElement();
    this.inputEl = this.element.querySelector('input');
    this.imgEl = this.element.querySelector('img');
    this.addEventListeners();
  }

  createElement() {
    const badge = document.createElement('div');
    badge.classList.add('advanced-search-badge');
    badge.innerHTML = `
      <div class="advanced-search-badge__container">
        <span class="advanced-search-badge__type">${this.type}:</span>
        <img src=""/>
        <input size="1" type="text" class="advanced-search-badge__value" />
      </div>
    `;
    return badge;
  }

  addEventListeners() {
    this.inputEl.addEventListener('input', this.onInput.bind(this));
    this.inputEl.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && this.value === '') {
        e.preventDefault();
        e.stopPropagation();
        this.destroy();
      }
    });
  }

  onInput() {
    if (this.value.endsWith(' ')) {
      this.blur();
      this.value = this.value.trim('');
    } else {
      this.emptyImgSrc();
      this.emit('change', this.value);
    }
    this.setInputSize();
  }

  setInputSize() {
    this.inputEl.setAttribute('size', this.value.length || 1);
  }

  setItem(item) {
    this.emptyImgSrc();

    if (item instanceof UserItem) {
      this.value = item.screen_name;
      this.imgEl.src = item.profile_image_url_https;
    }
  }

  emptyImgSrc() {
    this.imgEl.src = '';
  }

  focus() {
    this.inputEl.focus();
  }

  blur() {
    this.inputEl.blur();
    this.emit('blur');
  }

  destroy() {
    this.element.remove();
    this.emit('destroy');
    this.off();
  }

  get focused() {
    return document.activeElement === this.inputEl;
  }

  get value() {
    let value = this.inputEl.value

    if (value.length) {
      value = '@' + value;
    }

    return value;
  }

  get query() {
    return `(${this.type}:${this.value})`;
  }

  set value(value) {
    this.inputEl.value = value.replaceAll('@', '');
    this.setInputSize();
  }
}

class UserItem extends EventEmiter {
  constructor(user) {
    super();
    Object.assign(this, user);
    this.selected = false;
    this.element = this.createElement();
    this.element.addEventListener('click', () => this.emit('click'));
  }

  select() {
    this.selected = true;
    this.element.classList.add('selected');
  }

  deselect() {
    this.selected = false;
    this.element.classList.remove('selected');
  }

  highlightQuery(query) {
    const elementsToHighlight = this.element.querySelectorAll('.allow-hl');
    const regex = new RegExp(query, 'gi');

    elementsToHighlight.forEach(el => {
      el.innerHTML.match(regex)?.forEach((match) => {
        el.innerHTML = el.innerHTML.replaceAll(match, `<mark>${match}</mark>`);
      });
    });
  }

  createElement() {
    const element = document.createElement('div');
    element.classList.add('user-item');
    element.innerHTML = `
      <div role="option" aria-selected="false" class="css-1dbjc4n" data-testid="typeaheadResult">
        <div role="button" tabindex="0" class="css-18t94o4 css-1dbjc4n r-6dt33c r-1ny4l3l r-o7ynqc r-6416eg">
          <div role="button" tabindex="0" class="css-18t94o4 css-1dbjc4n r-1ny4l3l r-ymttw5 r-1f1sjgu"
            data-testid="TypeaheadUser">
            <div class="css-1dbjc4n r-18u37iz">
              <img alt="" draggable="true"src="${this.profile_image_url_https}" style="width: 60px;border-radius: 100%;margin-right: 12px;">
              <div class="css-1dbjc4n r-1iusvr4 r-16y2uox">
                <div class="css-1dbjc4n r-1awozwy r-18u37iz r-1wtj0ep">
                  <div class="css-1dbjc4n r-1wbh5a2 r-dnmrzs r-1ny4l3l">
                    <div class="css-1dbjc4n r-1wbh5a2 r-dnmrzs r-1ny4l3l">
                      <div class="css-1dbjc4n r-1wbh5a2 r-dnmrzs r-1ny4l3l">
                        <div class="css-1dbjc4n r-1awozwy r-18u37iz r-dnmrzs">
                          <div dir="auto"
                            class="css-901oao r-1awozwy r-1nao33i r-6koalj r-37j5jr r-a023e6 r-b88u0q r-rjixqe r-bcqeeo r-1udh08x r-3s2u2q r-qvutc0">
                            <span class="css-901oao css-16my406 css-1hf3ou5 r-poiln3 r-bcqeeo r-qvutc0"><span
                                class="css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0 allow-hl">${this.name}</span></span>
                          </div>
                          ${this.verified !== true ? '' : '<div dir="auto" class="css-901oao r-1nao33i r-xoduu5 r-18u37iz r-1q142lx r-37j5jr r-a023e6 r-16dba41 r-rjixqe r-bcqeeo r-qvutc0"> <svg viewBox="0 0 24 24" aria-label="Verified account" role="img" class="r-13v1u17 r-4qtqp9 r-yyyyoo r-1xvli5t r-9cviqr r-f9ja8p r-og9te1 r-bnwqim r-1plcrui r-lrvibr"> <g> <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"> </path> </g> </svg> </div>'}
                        </div>
                      </div>
                      <div class="css-1dbjc4n r-1awozwy r-18u37iz r-1wbh5a2">
                        <div tabindex="-1" class="css-1dbjc4n r-1wbh5a2 r-dnmrzs r-1ny4l3l">
                          <div class="css-1dbjc4n">
                            <div dir="ltr"
                              class="css-901oao css-1hf3ou5 r-1bwzh9t r-18u37iz r-37j5jr r-a023e6 r-16dba41 r-rjixqe r-bcqeeo r-qvutc0">
                              <span class="css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0 allow-hl">@${this.screen_name}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="css-1dbjc4n r-1awozwy r-18u37iz r-1v8amoe">
                  <div class="css-1dbjc4n r-1q142lx"></div>
                  <div dir="auto"
                    class="css-901oao css-1hf3ou5 r-1bwzh9t r-37j5jr r-a023e6 r-16dba41 r-rjixqe r-bcqeeo r-nk90ef r-qvutc0">
                    <span dir="ltr" class="css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0"><span
                        class="css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0 allow-hl">${this.result_context.display_string}</span></span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return element;
  }
};

// This is just to remove event listeners
function replaceForClone(node) {
  const parent = node.parentElement;

  node.remove();
  node = node.cloneNode(true);
  parent.appendChild(node);

  return node;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function debounce(f, interval) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);
    return new Promise((resolve) => {
      timer = setTimeout(
        () => resolve(f(...args)),
        interval,
      );
    });
  };
}


const hoverColor = '#e8f5fe';
const styles = `
.user-item.selected {
  background-color: ${hoverColor};
}

.user-item:hover {
  background-color: ${hoverColor};
}

.advanced-search-badge__container {
  display: flex;
  align-items: center;
  padding: 4px;
  background: rgb(240, 239, 247);
  border-radius: 8px;
  font-size: 14px;
  height: 16px;
}

.advanced-search-badge {
  display: flex;
  align-items: center;
}

.advanced-search-badge:not(:first-child) {
  margin-left: 4px;
}

.advanced-search-badge span{
  margin-right: 4px;
}

.advanced-search-badge input {
  background: transparent;
  border: none;
}

.advanced-search-badge input:focus {
  outline: none;
}

.advanced-search-badge img {
  width: 16px;
  border-radius: 100%;
  margin-right: 2px;
}

.advanced-search-badge img[src=""] {
  display: none;
}
`;

new TwitterSearch();