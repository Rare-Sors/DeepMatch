'use client'

import { useState } from 'react'
import { PreCommDemo, FitMemoDemo } from './precomm'

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    { id: 0, name: 'Founder Intake', icon: '📝' },
    { id: 1, name: 'Profile Generation', icon: '👤' },
    { id: 2, name: 'Matching', icon: '🤝' },
    { id: 3, name: 'Pre-Communication', icon: '💬' },
    { id: 4, name: 'Fit Memo', icon: '📋' }
  ]

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs text-gray-500 mb-2 tracking-wider">DEEPMATCH</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Complete Workflow Demo
          </h1>
          <p className="text-gray-600">
            Agent-Only Cofounder Matching Platform
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8 overflow-x-auto">
          <div className="inline-flex bg-white rounded-full p-1 shadow-sm border border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-full font-medium transition-all whitespace-nowrap text-sm ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          {activeTab === 0 && <IntakeDemo />}
          {activeTab === 1 && <ProfileDemo />}
          {activeTab === 2 && <MatchingDemo setActiveTab={setActiveTab} />}
          {activeTab === 3 && <PreCommDemo setActiveTab={setActiveTab} />}
          {activeTab === 4 && <FitMemoDemo />}
        </div>
      </div>
    </div>
  )
}

// 1. Founder Intake Demo Component
function IntakeDemo() {
  const [currentRound, setCurrentRound] = useState(0)

  const rounds = [
    { round: 1, layer: 'Identity', question: 'Tell me about yourself and your background', answer: 'I\'m a technical founder with 8 years in ML/AI...' },
    { round: 2, layer: 'Direction', question: 'What problem are you solving?', answer: 'Enterprise teams struggle with data quality...' },
    { round: 3, layer: 'Capability', question: 'What have you built before?', answer: 'Led data platform at Series B startup...' },
    { round: 4, layer: 'Collaboration', question: 'How do you work with others?', answer: 'I prefer async communication and clear documentation...' },
    { round: 5, layer: 'Constraints', question: 'What are your constraints?', answer: 'Need to stay in SF Bay Area, can commit 40hrs/week...' },
    { round: 6, layer: 'Credibility', question: 'Who can vouch for you?', answer: 'Former CTO at DataCorp, 3 successful exits...' },
    { round: 7, layer: 'Summary', question: 'Let me summarize what I learned', answer: 'Technical founder, enterprise data focus, proven track record...' }
  ]

  const layers = ['Identity', 'Direction', 'Capability', 'Collaboration', 'Constraints', 'Credibility']

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">7-Round Structured Interview</h2>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">Round {currentRound + 1} of 7</span>
          <span className="text-sm text-gray-900 font-medium">{Math.round(((currentRound + 1) / 7) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gray-900 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentRound + 1) / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Information Layers */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {layers.map((layer, idx) => (
          <div
            key={layer}
            className={`p-3 rounded-lg border transition-all ${
              idx <= currentRound
                ? 'bg-gray-100 border-gray-900 text-gray-900'
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
          >
            <div className="text-xs font-medium">{layer}</div>
          </div>
        ))}
      </div>

      {/* Interview Dialog */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
        <div className="mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Agent</div>
              <div className="bg-white rounded-lg p-4 text-gray-900 border border-gray-200">
                {rounds[currentRound].question}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Founder</div>
              <div className="bg-white rounded-lg p-4 text-gray-900 border border-gray-200">
                {rounds[currentRound].answer}
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600 mt-4">
          <span className="font-medium text-gray-900">Layer:</span> {rounds[currentRound].layer}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentRound(Math.max(0, currentRound - 1))}
          disabled={currentRound === 0}
          className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 border border-gray-200"
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentRound(Math.min(6, currentRound + 1))}
          disabled={currentRound === 6}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
        >
          Next Round
        </button>
      </div>
    </div>
  )
}

// 2. Profile Generation Demo Component
function ProfileDemo() {
  const publicProfile = {
    headline: 'Technical Founder | Enterprise Data Infrastructure',
    thesis: 'Building real-time data quality platform for enterprise teams',
    stage: 'Pre-seed / Idea',
    commitment: 'Full-time (40+ hrs/week)',
    strengths: ['ML/AI', 'Data Engineering', 'Team Leadership'],
    looking_for: 'Business/GTM cofounder with enterprise sales experience',
    trust_tier: 'L1'
  }

  const detailProfile = {
    problem_statement: 'Enterprise teams waste 40% of engineering time on data quality issues. Current tools are reactive, not preventive. We need real-time validation at ingestion.',
    execution_history: 'Led data platform at Series B startup (20→100 engineers). Built ML pipeline serving 50M+ requests/day. 3 successful product launches.',
    decision_style: 'Data-driven with fast iteration. Prefer small experiments over big bets. Weekly review cycles.',
    equity_expectations: '50/50 split with 4-year vesting. Open to adjustments based on capital contribution.',
    risk_tolerance: 'Medium-high. Comfortable with 18-month runway. Need product-market fit signals by month 6.'
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Two-Layer Profile System</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Public Profile */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Public Profile</h3>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
              L0 Visible
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Headline</div>
              <div className="text-gray-900">{publicProfile.headline}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Thesis</div>
              <div className="text-gray-900">{publicProfile.thesis}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Stage</div>
                <div className="text-gray-900">{publicProfile.stage}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Commitment</div>
                <div className="text-gray-900">{publicProfile.commitment}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Strengths</div>
              <div className="flex flex-wrap gap-2">
                {publicProfile.strengths.map(s => (
                  <span key={s} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm border border-gray-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Looking For</div>
              <div className="text-gray-900">{publicProfile.looking_for}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Trust Tier</div>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                {publicProfile.trust_tier}
              </span>
            </div>
          </div>
        </div>

        {/* Detail Profile */}
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Detail Profile</h3>
            <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
              L1 Matched Only
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Problem Statement</div>
              <div className="text-gray-900 text-sm">{detailProfile.problem_statement}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Execution History</div>
              <div className="text-gray-900 text-sm">{detailProfile.execution_history}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Decision Style</div>
              <div className="text-gray-900 text-sm">{detailProfile.decision_style}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Equity Expectations</div>
              <div className="text-gray-900 text-sm">{detailProfile.equity_expectations}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Risk Tolerance</div>
              <div className="text-gray-900 text-sm">{detailProfile.risk_tolerance}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-blue-900 text-sm">
          <strong>Privacy Model:</strong> Public Profile is visible to all L0+ users for browsing.
          Detail Profile is only revealed after mutual matching (L1).
        </div>
      </div>
    </div>
  )
}

// 3. Matching Demo Component
function MatchingDemo({ setActiveTab }: { setActiveTab: (tab: number) => void }) {
  const candidates = [
    {
      id: 1,
      name: 'Sarah Chen',
      headline: 'GTM Leader | B2B SaaS Growth',
      match_score: 92,
      signals: { direction: 95, capability: 88, stage: 90, commitment: 95, style: 85, risk: 92, credibility: 90 },
      status: 'mutual'
    },
    {
      id: 2,
      name: 'Alex Kumar',
      headline: 'Enterprise Sales | 10+ Years B2B',
      match_score: 85,
      signals: { direction: 80, capability: 90, stage: 85, commitment: 88, style: 82, risk: 80, credibility: 85 },
      status: 'sent'
    },
    {
      id: 3,
      name: 'Maria Rodriguez',
      headline: 'Product & Growth | Ex-Salesforce',
      match_score: 78,
      signals: { direction: 75, capability: 82, stage: 80, commitment: 75, style: 78, risk: 75, credibility: 80 },
      status: 'pending'
    }
  ]

  const [selectedCandidate, setSelectedCandidate] = useState(candidates[0])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Bidirectional Matching</h2>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {candidates.map(candidate => (
          <div
            key={candidate.id}
            onClick={() => setSelectedCandidate(candidate)}
            className={`bg-gray-50 rounded-lg p-4 cursor-pointer transition-all border-2 ${
              selectedCandidate.id === candidate.id
                ? 'border-gray-900'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
                {candidate.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="text-2xl font-bold text-gray-900">{candidate.match_score}%</div>
            </div>

            <div className="text-gray-900 font-medium mb-1">{candidate.name}</div>
            <div className="text-sm text-gray-600 mb-3">{candidate.headline}</div>

            <div className="flex items-center gap-2">
              {candidate.status === 'mutual' && (
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium border border-green-200">
                  ✓ Mutual Match
                </span>
              )}
              {candidate.status === 'sent' && (
                <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs font-medium border border-yellow-200">
                  → Request Sent
                </span>
              )}
              {candidate.status === 'pending' && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200">
                  ○ Not Contacted
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Matching Signals Radar */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Matching Signals: {selectedCandidate.name}
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {Object.entries(selectedCandidate.signals).map(([signal, score]) => (
              <div key={signal}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 capitalize">{signal.replace('_', ' ')}</span>
                  <span className="text-gray-900 font-medium">{score}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      score >= 90 ? 'bg-green-600' : score >= 80 ? 'bg-yellow-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="text-gray-900 font-medium mb-3">Match Reasoning</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ Strong direction alignment on enterprise data problems</li>
              <li>✓ Complementary skills: technical + GTM</li>
              <li>✓ Similar stage and commitment level</li>
              <li>✓ Compatible working styles and risk tolerance</li>
              <li>✓ Verified credibility through mutual connections</li>
            </ul>

            {selectedCandidate.status === 'mutual' && (
              <button
                onClick={() => setActiveTab(3)}
                className="w-full mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Start Pre-Communication →
              </button>
            )}
            {selectedCandidate.status === 'sent' && (
              <div className="mt-4 text-center text-yellow-700 text-sm">
                Waiting for response...
              </div>
            )}
            {selectedCandidate.status === 'pending' && (
              <button className="w-full mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                Send Match Request
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
