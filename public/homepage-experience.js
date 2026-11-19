(() => {
  const examples = [
    ['Riley Chen', 'Austin, TX', 'Single family', 325000, 'Fix and flip'],
    ['Jordan Rivera', 'Austin, TX', 'Duplex', 425000, 'Buy and hold'],
    ['Cameron Ellis', 'San Antonio, TX', 'Single family', 250000, 'Buy and hold'],
    ['Taylor Reed', 'Austin, TX', 'Single family', 275000, 'Buy and hold'],
    ['Morgan Hayes', 'Columbus, OH', 'Duplex', 300000, 'Buy and hold'],
    ['Avery Brooks', 'Atlanta, GA', 'Single family', 375000, 'Fix and flip']
  ];
  const buyers = examples.map(([name, market, type, maxPrice, strategy], id) => ({
    user: { id: 'example-' + id, name, role: 'buyer', location: market },
    label: type + ' acquisition criteria', cities: [market], propertyTypes: [type], maxPrice, strategy
  }));
  const connections = [
    { id: 'connection-agent', name: 'Casey Monroe', role: 'agent', location: 'Austin, TX' },
    { id: 'connection-lender', name: 'Drew Bennett', role: 'lender', location: 'Columbus, OH' },
    { id: 'connection-wholesaler', name: 'Skyler Davis', role: 'seller', location: 'Atlanta, GA' }
  ];
  const team = [
    { id: 'owner', name: 'Sam Patel', role: 'Owner' },
    { id: 'acquisitions', name: 'Alex Kim', role: 'Acquisitions' },
    { id: 'dispositions', name: 'Jamie Flores', role: 'Dispositions' }
  ];

  function open(title, { el, avatarNode, buyerDemandCard, personCard, money }) {
    const active = document.activeElement;
    const heading = el('h2', { id: 'home-preview-heading' }, title);
    const body = el('div', { class: 'home-preview-body', tabindex: '0', 'aria-label': 'Preview workspace' });
    const dialog = el('dialog', { class: 'home-preview-dialog', 'aria-labelledby': 'home-preview-heading' });
    const close = button('Close', () => dialog.close());
    dialog.append(el('header', { class: 'home-preview-header' }, [
      el('div', {}, [heading, el('p', { class: 'hint' }, 'Interactive preview · Example data')]), close
    ]), body);
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { dialog.remove(); active?.focus(); }, { once: true });

    function button(label, action, primary = false) {
      return el('button', { type: 'button', class: primary ? 'btn-primary' : 'btn-ghost', onclick: action }, label);
    }
    function show(...nodes) {
      body.replaceChildren(...nodes);
      body.scrollTop = 0;
      body.focus({ preventScroll: true });
    }

    function profile(user) {
      const buyer = buyers.find(row => row.user.id === user.id);
      show(button('Back to preview', main), el('div', { class: 'personcard home-preview-profile' }, [
        avatarNode(user), el('h3', {}, user.name), el('p', {}, user.location),
        el('p', {}, buyer ? buyer.strategy + ' · ' + buyer.label + ' · Up to ' + money(buyer.maxPrice) : 'Real estate professional · ' + user.role),
        button('Open sample conversation', () => message(user), true)
      ]));
    }

    const messages = new Map();
    function message(user) {
      const initial = [{ body: 'Hi, I’m looking for deals in ' + user.location + '. What are you working on?', mine: false }];
      const thread = messages.get(user.id) || initial;
      messages.set(user.id, thread);
      const stream = el('div', { class: 'chatstream home-preview-chat', role: 'log', 'aria-label': 'Sample conversation' });
      const add = ({ body: text, mine }) => stream.append(el('div', { class: 'bubble ' + (mine ? 'mine' : 'theirs') }, [
        el('div', { class: 'bubbletext' }, text)
      ]));
      thread.forEach(add);
      const input = el('textarea', { placeholder: 'Write a sample message…', 'aria-label': 'Sample message', maxlength: '500' });
      const send = button('Try sending', () => {
        const text = input.value.trim();
        if (!text) return input.focus();
        const outgoing = { body: text, mine: true };
        const reply = { body: 'Thanks. I’d review the property against my buying criteria.', mine: false };
        thread.push(outgoing, reply);
        add(outgoing);
        add(reply);
        input.value = '';
        stream.scrollTop = stream.scrollHeight;
      }, true);
      show(button('Back to preview', main), el('h3', {}, user.name),
        el('p', { class: 'hint' }, 'Messages and replies stay in this preview.'), stream,
        el('div', { class: 'chatcomposer' }, [input, send]));
      stream.scrollTop = stream.scrollHeight;
    }

    const actions = { profile, message };
    function directory(network) {
      const query = el('input', { type: 'search', 'aria-label': network ? 'Search example connections' : 'Filter example buy boxes',
        placeholder: network ? 'Search example connections' : 'Filter by market or property type' });
      const results = el('div', { class: 'home-preview-results' });
      function draw() {
        const term = query.value.trim().toLowerCase();
        const rows = (network ? connections.map(user => ({ user })) : buyers).filter(row => [row.user.name, row.user.location, row.label, row.strategy].join(' ').toLowerCase().includes(term));
        results.replaceChildren(...(rows.length ? rows.map(row => network ? personCard(row.user, { preview: actions }) : buyerDemandCard(row, actions))
          : [el('p', { class: 'hint', role: 'status' }, 'No examples match this search.')]));
      }
      query.addEventListener('input', draw);
      draw();
      show(query, results);
    }

    function dispo() {
      const deals = [
        { market: 'Austin, TX', type: 'Single family', asking: 295000 },
        { market: 'Austin, TX', type: 'Duplex', asking: 360000 },
        { market: 'San Antonio, TX', type: 'Single family', asking: 210000 }
      ];
      const select = el('select', { 'aria-label': 'Select a sample deal' }, deals.map((deal, index) =>
        el('option', { value: String(index) }, deal.type + ' · ' + deal.market + ' · ' + money(deal.asking))));
      const results = el('div', { class: 'home-preview-results' });
      show(el('h3', {}, 'Select a sample deal'), select, el('div', { class: 'personactions' }, [
        button('Find buyer matches', () => {
          const deal = deals[Number(select.value)];
          const matches = buyers.filter(row => row.cities.includes(deal.market) && row.propertyTypes.includes(deal.type) && row.maxPrice >= deal.asking);
          results.replaceChildren(el('h3', {}, 'Matching example buy boxes'), ...matches.map(row => buyerDemandCard(row, actions)));
        }, true),
        button('Preview marketing draft', () => {
          const deal = deals[Number(select.value)];
          results.replaceChildren(el('article', { class: 'card' }, [
            el('h3', {}, 'Sample marketing draft'),
            el('p', {}, deal.type + ' opportunity in ' + deal.market + '. Asking ' + money(deal.asking) + '. Contact the listing team for property details.')
          ]));
        })
      ]), results);
      select.addEventListener('change', () => results.replaceChildren());
    }

    function teams() {
      const deals = [
        { name: 'Austin single family', member: 'acquisitions', stage: 'Lead' },
        { name: 'Columbus duplex', member: 'dispositions', stage: 'Dispo' },
        { name: 'Atlanta single family', member: 'owner', stage: 'Due diligence' }
      ];
      const filter = el('select', { 'aria-label': 'Filter deals by team member' }, [
        el('option', { value: '' }, 'Everyone'),
        ...team.map(member => el('option', { value: member.id }, member.name))
      ]);
      const results = el('div', { class: 'home-preview-results' });
      function draw() {
        const visible = deals.filter(deal => !filter.value || deal.member === filter.value);
        results.replaceChildren(...(visible.length ? visible.map(deal => {
          const assign = el('select', { 'aria-label': 'Assign ' + deal.name }, team.map(member => el('option', { value: member.id }, member.name)));
          assign.value = deal.member;
          assign.addEventListener('change', () => {
            deal.member = assign.value;
            status.textContent = deal.name + ' assigned in this preview.';
            if (filter.value) { draw(); filter.focus(); }
          });
          return el('article', { class: 'personcard' }, [el('h3', {}, deal.name), el('p', { class: 'hint' }, deal.stage), assign]);
        }) : [el('p', { class: 'hint' }, 'No example deals assigned.')]));
      }
      const status = el('p', { role: 'status', class: 'hint' });
      filter.addEventListener('change', draw);
      draw();
      show(el('h3', {}, 'Team members'), el('div', { class: 'home-preview-members' }, team.map(member =>
        el('div', { class: 'personcard' }, [avatarNode(member, 'small'), el('b', {}, member.name), el('p', { class: 'hint' }, member.role)]))),
      el('h3', {}, 'Shared pipeline'), filter, results, status);
    }

    function main() {
      if (title === 'Better Dispo') return dispo();
      if (title === 'Wholesale Teams') return teams();
      directory(title === 'Network & Messages');
    }

    document.body.append(dialog);
    dialog.showModal();
    main();
    close.focus();
  }

  function community(el, api) {
    const visual = el('span', { 'aria-hidden': 'true' });
    const accessible = el('span', { class: 'home-community-accessible' });
    const section = el('section', { class: 'home-community', hidden: '' }, el('div', { class: 'homewide' }, [
      el('h2', { class: 'home-community-title' }, [visual, accessible]),
      el('p', {}, 'Is better your standard?')
    ]));
    const format = new Intl.NumberFormat('en-US');
    let onScreen = typeof IntersectionObserver !== 'function';
    let target = 0;
    let displayed = 0;
    let suffix = '';
    let animation = 0;
    let requesting = false;
    function draw(value) {
      displayed = value;
      visual.textContent = 'Join ' + format.format(value) + (value === target ? suffix : '') +
        (value === 1 ? ' member' : ' members');
    }
    function animate() {
      if (!onScreen || !target) return;
      cancelAnimationFrame(animation);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || target <= displayed) return draw(target);
      const from = displayed;
      const start = performance.now();
      function frame(now) {
        if (!section.isConnected) return;
        const progress = Math.min(1, (now - start) / 1050);
        draw(Math.round(from + (target - from) * (1 - (1 - progress) ** 3)));
        if (progress < 1) animation = requestAnimationFrame(frame);
      }
      animation = requestAnimationFrame(frame);
    }
    const observer = onScreen ? null : new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) animate();
    }, { threshold: 0.24 });
    observer?.observe(section);

    async function refresh() {
      if (requesting) return;
      requesting = true;
      try {
        const { members, milestone } = await api('GET', '/api/public/member-milestone');
        if (!section.isConnected || !Number.isSafeInteger(members) || members < 0) return;
        if (members === target) return;
        target = members;
        suffix = milestone ? '+' : '';
        section.hidden = target === 0;
        accessible.textContent = 'Join ' + format.format(target) + suffix + (target === 1 ? ' member' : ' members');
        if (!target) { cancelAnimationFrame(animation); displayed = 0; return; }
        if (!displayed) draw(0);
        animate();
      } catch {
        // Keep the last verified milestone through a temporary network failure.
      } finally {
        requesting = false;
      }
    }
    const timer = setInterval(() => {
      if (!section.isConnected) { clearInterval(timer); observer?.disconnect(); cancelAnimationFrame(animation); }
      else if (!document.hidden) refresh();
    }, 60000);
    requestAnimationFrame(() => {
      if (section.isConnected) refresh();
      else { clearInterval(timer); observer?.disconnect(); }
    });
    return section;
  }

  window.BetterHome = { open, community };
})();
