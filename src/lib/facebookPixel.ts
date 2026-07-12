export const initFacebookPixel = () => {
  const pixelId = import.meta.env.VITE_FACEBOOK_PIXEL_ID;

  if (!pixelId || window.fbq) return;

  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );

  fbq("init", pixelId);
  fbq("track", "PageView");
};

// Fonction générique
export const trackEvent = (eventName, params = {}) => {
  if (window.fbq) {
    window.fbq("track", eventName, params);
  }
};

// Événements prêts à l'emploi
export const trackViewContent = (contentName) => {
  trackEvent("ViewContent", { content_name: contentName });
};

export const trackLead = () => {
  trackEvent("Lead");
};

export const trackContact = () => {
  trackEvent("Contact");
};

export const trackCompleteRegistration = () => {
  trackEvent("CompleteRegistration");
};