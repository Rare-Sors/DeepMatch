import { useState } from 'react'

export function PreCommDemo({ setActiveTab }: { setActiveTab: (tab: number) => void }) {
  const [currentTopic, setCurrentTopic] = useState(0)

  const topics = [
    {
      name: 'Direction',
      questions: [
        'What specific problem are we solving?',
        'Who is our target customer?',
        'What\'s our 3-year vision?'
      ],
      discussion: 'Both aligned on enterprise data quality as core problem. Target: mid-market companies (100-1000 employees). Vision: become the standard for real-time data validation.'
    },
    {
      name: 'Role',
      questions: [
        'What will each founder own?',
        'How do we make decisions?',
        'What happens if we disagree?'
      ],
      discussion: 'Tech founder: product & engineering. Business founder: GTM & operations. Major decisions require consensus. Disagreements escalate to advisor board.'
    },
    {
      name: 'Commitment',
      questions: [
        'How much time can each commit?',
        'What are the financial constraints?',
        'When can we go full-time?'
      ],
      discussion: 'Both can commit 40+ hrs/week immediately. 12-month runway each. Both ready to go full-time after seed raise or first revenue.'
    },
    {
      name: 'Working Style',
      questions: [
        'How do we communicate?',
        'What\'s our meeting cadence?',
        'Remote or in-person?'
      ],
      discussion: 'Async-first with Slack. Weekly sync on Mondays. Daily standups async. Prefer in-person 2-3 days/week in SF.'
    },
    {
      name: 'Structure',
      questions: [
        'How do we split equity?',
        'What\'s the vesting schedule?',
        'How do we handle IP?'
      ],
      discussion: '50/50 equity split. 4-year vesting with 1-year cliff. All IP assigned to company. Standard founder agreements.'
    },
    {
      name: 'Risk',
      questions: [
        'What\'s our risk tolerance?',
        'When do we pivot vs persist?',
        'What are our exit expectations?'
      ],
      discussion: 'Medium-high risk tolerance. Pivot if no PMF signals by month 6. Open to acquisition but building for $100M+ outcome.'
    }
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Structured Pre-Communication</h2>

      {/* Topic Progress */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {topics.map((topic, idx) => (
          <button
            key={topic.name}
            onClick={() => setCurrentTopic(idx)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all text-sm ${
              idx === currentTopic
                ? 'bg-gray-900 text-white'
                : idx < currentTopic
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {idx < currentTopic && '✓ '}
            {topic.name}
          </button>
        ))}
      </div>

      {/* Current Topic Content */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Topic {currentTopic + 1}: {topics[currentTopic].name}
        </h3>

        <div className="mb-6">
          <div className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Key Questions:</div>
          <ul className="space-y-2">
            {topics[currentTopic].questions.map((q, idx) => (
              <li key={idx} className="text-gray-900 flex items-start gap-2">
                <span className="text-gray-400">•</span>
                {q}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Agent Summary:</div>
          <div className="text-gray-900">{topics[currentTopic].discussion}</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentTopic(Math.max(0, currentTopic - 1))}
          disabled={currentTopic === 0}
          className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg disabled:opacity-50 border border-gray-200 hover:bg-gray-200"
        >
          Previous Topic
        </button>
        <button
          onClick={() => {
            if (currentTopic === 5) {
              setActiveTab(4)
            } else {
              setCurrentTopic(Math.min(5, currentTopic + 1))
            }
          }}
          disabled={currentTopic === 5}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-50 hover:bg-gray-800"
        >
          {currentTopic === 5 ? 'Generate Fit Memo' : 'Next Topic'}
        </button>
      </div>
    </div>
  )
}

export function FitMemoDemo() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Fit Memo</h2>

      <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Cofounder Compatibility Assessment</h3>
          <span className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium border border-green-200">
            ✓ Recommended
          </span>
        </div>

        {/* Alignment Summary */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Alignment Summary</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="text-gray-900 font-medium">Strong Direction Alignment</div>
                <div className="text-sm text-gray-600">Both focused on enterprise data quality with clear target market and 3-year vision</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="text-gray-900 font-medium">Complementary Skills</div>
                <div className="text-sm text-gray-600">Technical + GTM expertise creates complete founding team</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="text-gray-900 font-medium">Aligned Commitment & Timeline</div>
                <div className="text-sm text-gray-600">Both ready for full-time commitment with 12-month runway</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="text-gray-900 font-medium">Compatible Working Style</div>
                <div className="text-sm text-gray-600">Async-first communication with regular in-person collaboration</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="text-gray-900 font-medium">Clear Structure Agreement</div>
                <div className="text-sm text-gray-600">50/50 equity split with standard vesting, decision-making process defined</div>
              </div>
            </div>
          </div>
        </div>

        {/* Potential Concerns */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Potential Concerns</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                !
              </div>
              <div>
                <div className="text-gray-900 font-medium">Pivot Decision Timeline</div>
                <div className="text-sm text-gray-600">6-month pivot window is aggressive. Consider extending to 9-12 months for enterprise sales cycles.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                !
              </div>
              <div>
                <div className="text-gray-900 font-medium">Conflict Resolution Process</div>
                <div className="text-sm text-gray-600">Advisor board escalation is good, but define specific advisors and decision criteria upfront.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Recommendation</h4>
          <div className="text-gray-900 mb-4">
            <strong>Proceed to Human Meeting</strong>
          </div>
          <div className="text-gray-700 mb-4">
            This pairing shows strong alignment across all critical dimensions. The complementary skill sets, shared vision, and compatible working styles create a solid foundation for a cofounder relationship.
          </div>
          <div className="text-gray-900 mb-2">
            <strong>Suggested Next Steps:</strong>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
            <li>Schedule in-person meeting to discuss potential concerns</li>
            <li>Define specific advisor board members and escalation criteria</li>
            <li>Revisit pivot timeline based on enterprise sales cycle realities</li>
            <li>Consider 30-day trial project to validate working relationship</li>
          </ol>

          <div className="flex gap-3">
            <button className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
              Schedule Meeting
            </button>
            <button className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
              Start Trial Project
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
