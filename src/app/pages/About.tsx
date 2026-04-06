import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useBackNavigate } from '../hooks/useBackNavigate';
import { LiveChatBox } from '../components/LiveChatBox';
import { useState } from 'react';
import { Header } from '../components/Header';

export default function About() {
  const goBack = useBackNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="size-full overflow-auto bg-white">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={goBack} aria-label="Go back"
            className="btn-mobile-icon"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3] flex-1 text-center mr-10">About</h1>
        </div>

        {/* WHAT WE DO Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold italic text-center mb-4">WHAT WE DO</h2>
          
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              <span className="text-red-600">Steadfast</span> is a <span className="text-red-600">technology-driven growth marketing</span> firm driven by an exceptional team of consulting marketers, creatives, analysts, and technologists. We drive revenue growth and brand awareness for merchants at ecommerce companies around the world (such as Amazon, Walmart, etc).
            </p>

            <p>Marketing is no longer about a singular offer or what your brand presents visually. It's a sprawling journey with countless touch points</p>

            <p>Consumers shop with their values and gravitate towards brands they trust. They want to be a part of a tribe. A story. What's more, the path to purchase is far less linear, with more friction, designed to be fast, frictionless, and transparent</p>

            <p>The media landscape is vastly different, too. Measurement is smarter but also harder than ever</p>

            <p>Marketing should be a strategic business driver, a road that leads to profitable revenue growth and brand lift</p>

            <p>We take the guesswork out of marketing, making the most from your investment so you get what you really care about: growth, handed from planning to execution</p>

            <p>Our experienced team develops custom marketing playbooks fuelled by your data, market trends and industry insights to set you apart from the competition, designed to drive revenue and brand lift</p>

            <p>Our proprietary technology, tools, analyzes a company's digital ecosystem using multiple first-party data sources to build informed and custom marketing plans. And, neva de-risks investments by optimizing capital allocation - pulling marketers, operators and the investment community in a strategic seat at the table</p>

            <p>When you know the customer journey, singular channels don't matter because you're building a strategic program. That's what we are in the business of - igniting growth and brand recognition for the brands we are lucky to call our clients.</p>
          </div>
        </section>

        {/* Data Service Section */}
        <section className="mb-6">
          <h3 className="text-lg font-bold italic mb-2">Data Service</h3>
          <p className="text-sm">On this centralized cloud-based work platform, users provide real optimization data for partner merchants, increasing product exposure and conversion rates. At the same time, workers can earn generous commissions</p>
        </section>

        {/* VIP Description Section */}
        <section className="mb-6">
          <h3 className="text-lg font-bold italic mb-2">VIP Description</h3>
          <p className="text-sm">VIP workers can receive higher task benefits, and Premium tasks benefits of each level are different. As the level increases, the benefits will also increase. If a negative number appears in the Premium Task during the process, the commission will also increase</p>
        </section>

        {/* Daily Work Section */}
        <section className="mb-6">
          <h3 className="text-lg font-bold italic mb-2">Daily Work</h3>
          <p className="text-sm">Whether you are working full-time or part time, by resetting your work account daily, you can earn <span className="text-red-600">task income</span>, complete 2 sets of reset tasks, and generate valid workdays, providing stable base salary income</p>
        </section>

        {/* Team Task Section */}
        <section className="mb-8">
          <h3 className="text-lg font-bold italic mb-2">Team Task</h3>
          <p className="text-sm mb-6">We value talent, nurture relationships, and create growth opportunities for everyone. We will assist those with the capability and the desire to excel in this new job in forming their own teams, achieving growth and mutual success</p>

          {/* Legal Sections */}
          <div className="space-y-6">
            {/* 1. Legality and Licenses */}
            <div>
              <h4 className="font-bold mb-2">1.Legality and Licenses</h4>
              <p className="text-sm mb-1">1.1) Compliance Requirements: Taskwork in the <span className="text-red-600">U.S.</span> is not uniform; each <span className="text-red-600">state</span> has its own labor laws. California and Delaware are known for their labor law compliance</p>
              <p className="text-sm">1.2) Licenses: Platform companies must obtain licenses to operate legally. The license application process typically includes background checks and financial reviews</p>
            </div>

            {/* 2. Age Restrictions */}
            <div>
              <h4 className="font-bold mb-2">2.Age Restrictions</h4>
              <p className="text-sm">2.1) Legal Age: Participants must be at least <span className="text-red-600">20 years old</span>. Some states set the legal age for work and prize activities at <span className="text-red-600">18</span></p>
            </div>

            {/* 3. Advertising and Marketing */}
            <div>
              <h4 className="font-bold mb-2">3.Advertising and Marketing</h4>
              <p className="text-sm mb-1">3.1) Advertising Content: Platform advertisements are strictly regulated to prevent exposure to minors. Ads must be truthful, clear, and not misleading</p>
              <p className="text-sm">3.2) Responsible Company: Many states require platform companies to include responsible company information and resources for assistance in advertisements</p>
            </div>

            {/* 4. Player Protection */}
            <div>
              <h4 className="font-bold mb-2">4.Player Protection</h4>
              <p className="text-sm">4.1) Platform Support: Platform companies must provide help information and support services, such as a 24-hour helpline, for players in need</p>
            </div>

            {/* 5. Taxation and Reporting */}
            <div>
              <h4 className="font-bold mb-2">5.Taxation and Reporting</h4>
              <p className="text-sm mb-1">5.1) Taxation: Large "Pay Day Bonus" winnings are subject to federal and state income taxes</p>
              <p className="text-sm">5.2) Reporting Obligations: Platform companies must report certain large payments and winnings to tax authorities</p>
            </div>

            {/* 6. Compliance and Auditing */}
            <div>
              <h4 className="font-bold mb-2">6.Compliance and Auditing</h4>
              <p className="text-sm mb-1">6.1) Regular Audits: Platform companies undergo regular audits to ensure compliance and financial transparency</p>
              <p className="text-sm">6.2) Penalties for Violations: Violations may result in fines, license revocation, or other legal penalties</p>
            </div>

            {/* 7. Intellectual Property */}
            <div>
              <h4 className="font-bold mb-2">7.Intellectual Property</h4>
              <p className="text-sm mb-1">7.1) Materials: Website, technology, text, images, graphics, audio, and video content are protected by copyright, trademark, and other intellectual property laws</p>
              <p className="text-sm">7.2) Users may not copy, modify, distribute, sell, or otherwise exploit any content related to the company's services without written permission</p>
            </div>

            {/* 8. Anti-Discrimination Laws */}
            <div>
              <h4 className="font-bold mb-2">8.Anti-Discrimination Laws</h4>
              <p className="text-sm">8.1) Equal Employment Opportunity (EEO): Discrimination based on race, gender, religion, age, or disability in hiring and employment is prohibited</p>
            </div>

            {/* 9. Data Privacy and Security */}
            <div>
              <h4 className="font-bold mb-2">9.Data Privacy and Security</h4>
              <p className="text-sm mb-1">9.1) Data Protection Laws: Laws governing the handling and protection of user data. The California Consumer Privacy Act (CCPA) and General Data Protection Regulation (GDPR) impose strict requirements on data processing and privacy</p>
              <p className="text-sm mb-1">9.2) Platform Policies: Platforms typically have privacy policies and data protection measures to ensure user data security</p>
              <p className="text-sm mb-1">9.3) Data Protection: Measures are in place to protect employee and customer data in accordance with relevant privacy laws</p>
              <p className="text-sm">9.4) IT Use Policy: Regulations for the use of company equipment and networks to prevent misuse and data breaches</p>
            </div>

            {/* 10. Platform Use Rules */}
            <div>
              <h4 className="font-bold mb-2">10.Platform Use Rules</h4>
              <p className="text-sm mb-1">10.1) Service Agreement: Work platforms usually have user agreements or terms of service that specify rules of use, fee structures, and dispute resolution procedures</p>
              <p className="text-sm">10.2) Payment Processing: Defines payment processes, commission charges, and how to handle transaction disputes</p>
            </div>

            {/* 11. Compensation and Benefits */}
            <div>
              <h4 className="font-bold mb-2">11.Compensation and Benefits</h4>
              <p className="text-sm mb-1">11.1) Salary Policy: The system settlement upon completion of a set of 40/40 optimization tasks</p>
              <p className="text-sm mb-1">11.2) Commission Payment Cycle: Immediate return to the user's platform account wallet upon order completion</p>
              <p className="text-sm mb-1">11.3) Receiving VIP Payment Cycle: Immediate settlement to the platform account wallet upon user recharge completion</p>
              <p className="text-sm">11.4) Other Bonus Payment Cycle: Immediate settlement to the platform account wallet upon order completion</p>
            </div>

            {/* 12. Disclaimer */}
            <div>
              <h4 className="font-bold mb-2">12.Disclaimer</h4>
              <p className="text-sm">12.1) The company is not responsible for any direct, indirect, incidental, special, or consequential damages arising from the use of its services or products. Users assume the risk of using services or products. This disclaimer applies to the fullest extent permitted by law</p>
            </div>

            {/* 13. Amendment and Interpretation Rights */}
            <div>
              <h4 className="font-bold mb-2">13.Amendment and Interpretation Rights</h4>
              <p className="text-sm">13.1) The company reserves the right to modify, change, or update this policy and terms at any time without prior notice. Modified terms will take effect immediately upon publication. The company retains the final interpretation of this policy and terms</p>
            </div>

            {/* 14. Responsibility and Disclaimer */}
            <div>
              <h4 className="font-bold mb-2">14.Responsibility and Disclaimer</h4>
              <p className="text-sm">14.1) Users agree to indemnify and hold the company harmless from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney fees) arising from the violation of these terms or the use of the company's services or products. The company is not liable for any damages or losses resulting from the use or inability to use these services or products to the maximum extent permitted by law</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-12 mb-6">
          <p>© 2026 Steadfast Digital, Inc. All rights reserved</p>
        </div>
      </div>

      {/* Live Chat Box */}
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}