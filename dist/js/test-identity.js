/* Shared pseudonymous test identity. Never an authentication credential. */
(() => {
  const key = 'festpay_trial_v1';
  const valid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const normalize = value => valid(value?.trim()) ? value.trim().toLowerCase() : null;
  // Fragment values are not sent to the hosting server. No access tokens in links.
  const supplied = new URLSearchParams(location.hash.slice(1)).get('trial');
  const read = () => normalize(sessionStorage.getItem(key));
  const save = value => {
    const id = normalize(value);
    if (!id) throw Error('Ungültige Versuchs-ID');
    sessionStorage.setItem(key, id);
    return id;
  };
  if (normalize(supplied)) save(supplied);
  const link = (path, id) => path + '#trial=' + encodeURIComponent(normalize(id) || '');
  window.FestPayIdentity = {valid, normalize, read, save, create:() => save(crypto.randomUUID()), link};
})();
