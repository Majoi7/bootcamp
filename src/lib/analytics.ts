// analytics.ts
import { supabase } from "@/lib/supabase";

export const trackEvent = async (
  eventType: string,
  source?: string,
  metadata?: object
) => {
  await supabase.from("analytics_events").insert({
    event_type: eventType,
    source: source || detectSource(), // facebook, instagram, etc.
    country: detectCountry(),
    metadata: metadata || {},
  });
};

// Utilisation :
trackEvent('pageview', 'facebook');
trackEvent('lead', 'facebook', { questionnaire_step: 1 });
trackEvent('purchase', 'facebook', { amount: 10000 });