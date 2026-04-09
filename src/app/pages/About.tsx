import { ChevronLeft } from 'lucide-react';
import { useBackNavigate } from '../hooks/useBackNavigate';
import { useState, lazy, Suspense, type ReactNode } from 'react';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { Header } from '../components/Header';

const A = ({ children }: { children: ReactNode }) => <span className="text-[#c8956c] font-semibold">{children}</span>;

export default function About() {
  const goBack = useBackNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="size-full overflow-auto bg-[#0a0a0a]">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-16">
        {/* Back + Title */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={goBack} aria-label="Go back" className="btn-mobile-icon">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[28px] font-bold tracking-tight text-[#f5f0eb] flex-1 text-center mr-10">
            About
          </h1>
        </div>

        <div className="space-y-4">
          {/* WHAT WE DO */}
          <SectionCard title="What We Do">
            <p>
              <A>Steadfast</A> is a <A>technology-driven growth marketing</A> firm driven by an exceptional team of consulting marketers, creatives, analysts, and technologists. We drive revenue growth and brand awareness for merchants at ecommerce companies around the world (such as Amazon, Walmart, etc).
            </p>
            <p>Marketing is no longer about a singular offer or what your brand presents visually. It's a sprawling journey with countless touch points</p>
            <p>Consumers shop with their values and gravitate towards brands they trust. They want to be a part of a tribe. A story. What's more, the path to purchase is far less linear, with more friction, designed to be fast, frictionless, and transparent</p>
            <p>The media landscape is vastly different, too. Measurement is smarter but also harder than ever</p>
            <p>Marketing should be a strategic business driver, a road that leads to profitable revenue growth and brand lift</p>
            <p>We take the guesswork out of marketing, making the most from your investment so you get what you really care about: growth, handed from planning to execution</p>
            <p>Our experienced team develops custom marketing playbooks fuelled by your data, market trends and industry insights to set you apart from the competition, designed to drive revenue and brand lift</p>
            <p>Our proprietary technology, tools, analyzes a company's digital ecosystem using multiple first-party data sources to build informed and custom marketing plans. And, neva de-risks investments by optimizing capital allocation - pulling marketers, operators and the investment community in a strategic seat at the table</p>
            <p>When you know the customer journey, singular channels don't matter because you're building a strategic program. That's what we are in the business of - igniting growth and brand recognition for the brands we are lucky to call our clients.</p>
          </SectionCard>

          {/* Data Service */}
          <SectionCard title="Data Service">
            <p>On this centralized cloud-based work platform, users provide real optimization data for partner merchants, increasing product exposure and conversion rates. At the same time, workers can earn generous commissions</p>
          </SectionCard>

          {/* VIP Description */}
          <SectionCard title="VIP Description">
            <p>VIP workers can receive higher task benefits, and Premium tasks benefits of each level are different. As the level increases, the benefits will also increase. If a negative number appears in the Premium Task during the process, the commission will also increase</p>
          </SectionCard>

          {/* Daily Work */}
          <SectionCard title="Daily Work">
            <p>Whether you are working full-time or part time, by resetting your work account daily, you can earn <A>task income</A>, complete 2 sets of reset tasks, and generate valid workdays, providing stable base salary income</p>
          </SectionCard>

          {/* Team Task */}
          <SectionCard title="Team Task">
            <p>We value talent, nurture relationships, and create growth opportunities for everyone. We will assist those with the capability and the desire to excel in this new job in forming their own teams, achieving growth and mutual success</p>
          </SectionCard>

          {/* Legal Sections */}
          {[
            { num: '1', title: 'Legality and Licenses', items: [
              <>Compliance Requirements: Taskwork in the <A>U.S.</A> is not uniform; each <A>state</A> has its own labor laws. California and Delaware are known for their labor law compliance</>,
              'Licenses: Platform companies must obtain licenses to operate legally. The license application process typically includes background checks and financial reviews',
            ]},
            { num: '2', title: 'Age Restrictions', items: [
              <>Legal Age: Participants must be at least <A>20 years old</A>. Some states set the legal age for work and prize activities at <A>18</A></>,
            ]},
            { num: '3', title: 'Advertising and Marketing', items: [
              'Advertising Content: Platform advertisements are strictly regulated to prevent exposure to minors. Ads must be truthful, clear, and not misleading',
              'Responsible Company: Many states require platform companies to include responsible company information and resources for assistance in advertisements',
            ]},
            { num: '4', title: 'Player Protection', items: [
              'Platform Support: Platform companies must provide help information and support services, such as a 24-hour helpline, for players in need',
            ]},
            { num: '5', title: 'Taxation and Reporting', items: [
              'Taxation: Large "Pay Day Bonus" winnings are subject to federal and state income taxes',
              'Reporting Obligations: Platform companies must report certain large payments and winnings to tax authorities',
            ]},
            { num: '6', title: 'Compliance and Auditing', items: [
              'Regular Audits: Platform companies undergo regular audits to ensure compliance and financial transparency',
              'Penalties for Violations: Violations may result in fines, license revocation, or other legal penalties',
            ]},
            { num: '7', title: 'Intellectual Property', items: [
              "Materials: Website, technology, text, images, graphics, audio, and video content are protected by copyright, trademark, and other intellectual property laws",
              "Users may not copy, modify, distribute, sell, or otherwise exploit any content related to the company's services without written permission",
            ]},
            { num: '8', title: 'Anti-Discrimination Laws', items: [
              'Equal Employment Opportunity (EEO): Discrimination based on race, gender, religion, age, or disability in hiring and employment is prohibited',
            ]},
            { num: '9', title: 'Data Privacy and Security', items: [
              'Data Protection Laws: Laws governing the handling and protection of user data. The California Consumer Privacy Act (CCPA) and General Data Protection Regulation (GDPR) impose strict requirements on data processing and privacy',
              'Platform Policies: Platforms typically have privacy policies and data protection measures to ensure user data security',
              'Data Protection: Measures are in place to protect employee and customer data in accordance with relevant privacy laws',
              'IT Use Policy: Regulations for the use of company equipment and networks to prevent misuse and data breaches',
            ]},
            { num: '10', title: 'Platform Use Rules', items: [
              'Service Agreement: Work platforms usually have user agreements or terms of service that specify rules of use, fee structures, and dispute resolution procedures',
              'Payment Processing: Defines payment processes, commission charges, and how to handle transaction disputes',
            ]},
            { num: '11', title: 'Compensation and Benefits', items: [
              'Salary Policy: The system settlement upon completion of a set of 40/40 optimization tasks',
              "Commission Payment Cycle: Immediate return to the user's platform account wallet upon order completion",
              'Receiving VIP Payment Cycle: Immediate settlement to the platform account wallet upon user recharge completion',
              'Other Bonus Payment Cycle: Immediate settlement to the platform account wallet upon order completion',
            ]},
            { num: '12', title: 'Disclaimer', items: [
              "The company is not responsible for any direct, indirect, incidental, special, or consequential damages arising from the use of its services or products. Users assume the risk of using services or products. This disclaimer applies to the fullest extent permitted by law",
            ]},
            { num: '13', title: 'Amendment and Interpretation Rights', items: [
              "The company reserves the right to modify, change, or update this policy and terms at any time without prior notice. Modified terms will take effect immediately upon publication. The company retains the final interpretation of this policy and terms",
            ]},
            { num: '14', title: 'Responsibility and Disclaimer', items: [
              "Users agree to indemnify and hold the company harmless from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney fees) arising from the violation of these terms or the use of the company's services or products. The company is not liable for any damages or losses resulting from the use or inability to use these services or products to the maximum extent permitted by law",
            ]},
          ].map((s) => (
            <NumberedCard key={s.num} num={s.num} title={s.title}>
              {s.items.map((item, i) => (
                <div key={i} className="flex gap-3 py-1.5">
                  <span className="text-[#6b635b] text-sm font-medium shrink-0 w-5 text-right tabular-nums">{i + 1}.</span>
                  <p className="text-[15px] leading-relaxed text-[#a89f95]">{item}</p>
                </div>
              ))}
            </NumberedCard>
          ))}
        </div>

        <p className="text-center text-xs text-[#6b635b] mt-12">
          © 2026 Steadfast Digital, Inc. All rights reserved
        </p>
      </div>

      <Suspense fallback={null}>
        <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </Suspense>
    </div>
  );
}

/* ── Section Card (text-only, no number badge) ─────────────── */
function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-xl px-5 py-5">
      <h2 className="text-lg font-semibold text-[#f5f0eb] mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-[#a89f95]">
        {children}
      </div>
    </div>
  );
}

/* ── Numbered Card (with accent badge, like FAQ) ───────────── */
function NumberedCard({ num, title, children }: { num: string; title: string; children: ReactNode }) {
  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-xl px-5 py-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="shrink-0 bg-[#c8956c]/15 text-[#c8956c] text-xs font-semibold rounded-md px-2 py-0.5">
          {num}
        </span>
        <h3 className="text-base font-semibold text-[#f5f0eb]">{title}</h3>
      </div>
      <div className="pl-1">{children}</div>
    </div>
  );
}