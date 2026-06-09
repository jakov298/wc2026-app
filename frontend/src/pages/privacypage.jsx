import React from 'react'

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>
      <h1 style={{ fontSize:36 }}>Privacy Policy</h1>
      <p style={{ color:'var(--txt3)', fontSize:13 }}>Last updated: June 9, 2026</p>

      <Section title="1. About this site">
        WC 2026 Intelligence (wc2026intelligence.com) is a free football analytics tool providing live power rankings, AI match analysis and condition-adjusted predictions for the 2026 FIFA World Cup. The site is operated as a personal project.
      </Section>

      <Section title="2. Data we collect">
        We do not require registration or collect personal data directly. However, third-party services used on this site may collect data as described below.
      </Section>

      <Section title="3. Google AdSense">
        This site uses Google AdSense to display advertisements. Google may use cookies and similar technologies to show ads based on your prior visits to this and other websites. You can opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer" style={{ color:'var(--accent)' }}>Google Ad Settings</a>. For more information see <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color:'var(--accent)' }}>Google's Privacy Policy</a>.
      </Section>

      <Section title="4. Cookies">
        This site uses cookies through Google AdSense for advertising purposes. No other cookies are set by this site directly. You can control cookies through your browser settings.
      </Section>

      <Section title="5. Third-party services">
        This site uses the following third-party services:
        <ul style={{ marginTop:8, paddingLeft:20, display:'flex', flexDirection:'column', gap:4 }}>
          <li>Google AdSense — advertising</li>
          <li>Anthropic Claude API — AI match analysis generation</li>
          <li>API-Football — live match data</li>
          <li>Supabase — database hosting</li>
          <li>Vercel — website hosting</li>
        </ul>
      </Section>

      <Section title="6. Analytics">
        This site does not currently use any analytics tracking tools. No user behaviour is tracked or stored.
      </Section>

      <Section title="7. Children's privacy">
        This site is not directed at children under 13. We do not knowingly collect data from children.
      </Section>

      <Section title="8. Changes to this policy">
        This policy may be updated from time to time. The date at the top of this page will reflect the most recent update.
      </Section>

      <Section title="9. Contact">
        For any questions about this privacy policy, you can reach out via the feedback option in your browser.
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 style={{ fontSize:18, marginBottom:8 }}>{title}</h2>
      <p style={{ color:'var(--txt2)', fontSize:14, lineHeight:1.7 }}>{children}</p>
    </div>
  )
}
