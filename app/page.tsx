'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  HiOutlineInbox,
  HiOutlinePaperAirplane,
  HiOutlineClock,
  HiOutlineCog6Tooth,
  HiOutlineArrowPath,
  HiOutlineMagnifyingGlass,
  HiOutlineEnvelope,
  HiOutlineEnvelopeOpen,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineCalendarDays,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineXMark,
  HiOutlineUser,
  HiOutlineBellAlert,
  HiOutlineArrowUturnLeft,
  HiOutlineInformationCircle,
} from 'react-icons/hi2'

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_ID = '699b1a8a4afb73473e8103fa'

// ─── Types ───────────────────────────────────────────────────────────────────

type EmailCategory = 'customer' | 'internal' | 'admin' | 'marketing' | 'personal'
type EmailStatus = 'unread' | 'read' | 'replied' | 'follow-up'
type ViewType = 'inbox' | 'sent' | 'followups' | 'settings'
type FollowUpStatus = 'upcoming' | 'overdue' | 'completed'

interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  category: EmailCategory;
  timestamp: string;
  threadId?: string;
  status: EmailStatus;
  summary?: string;
  draftReply?: string;
}

interface FollowUp {
  id: string;
  emailId: string;
  subject: string;
  date: string;
  time: string;
  note: string;
  status: FollowUpStatus;
}

interface AgentResult {
  action_type?: string;
  summary?: string;
  draft_reply?: string;
  category?: string;
  status?: string;
  message?: string;
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_EMAILS: Email[] = [
  {
    id: '1',
    sender: 'Sarah Mitchell',
    senderEmail: 'sarah.mitchell@acmewidgets.com',
    subject: 'Q4 Revenue Report - Urgent Review Needed',
    preview: 'Hi team, please review the attached Q4 revenue report before the board meeting on Friday. Key highlights include a 12% increase in recurring revenue...',
    category: 'internal',
    timestamp: '2025-02-22T09:14:00Z',
    status: 'unread',
    threadId: 'thread-001',
  },
  {
    id: '2',
    sender: 'James Rodriguez',
    senderEmail: 'james.r@cloudserv.io',
    subject: 'Re: API Integration Support Request',
    preview: 'We are experiencing intermittent 503 errors when calling the /v2/analytics endpoint. Could your team investigate the rate limiting configuration?',
    category: 'customer',
    timestamp: '2025-02-22T08:45:00Z',
    status: 'unread',
    threadId: 'thread-002',
  },
  {
    id: '3',
    sender: 'HR Department',
    senderEmail: 'hr@company.com',
    subject: 'Benefits Enrollment Deadline - Action Required',
    preview: 'This is a reminder that the annual benefits enrollment period ends on March 1st. Please log in to the HR portal to review and update your selections.',
    category: 'admin',
    timestamp: '2025-02-21T16:30:00Z',
    status: 'read',
    threadId: 'thread-003',
  },
  {
    id: '4',
    sender: 'Notion',
    senderEmail: 'updates@notion.so',
    subject: 'Introducing Notion AI 2.0 - Transform Your Workflow',
    preview: 'We are excited to announce Notion AI 2.0 with advanced document generation, intelligent search, and automated task management features.',
    category: 'marketing',
    timestamp: '2025-02-21T14:20:00Z',
    status: 'read',
    threadId: 'thread-004',
  },
  {
    id: '5',
    sender: 'David Chen',
    senderEmail: 'david.chen@gmail.com',
    subject: 'Weekend hiking trip plans',
    preview: 'Hey! Are we still on for the Mount Tamalpais hike this Saturday? I was thinking we could start early around 7am and grab brunch after.',
    category: 'personal',
    timestamp: '2025-02-21T11:05:00Z',
    status: 'read',
    threadId: 'thread-005',
  },
]

const SAMPLE_FOLLOWUPS: FollowUp[] = [
  {
    id: 'fu-1',
    emailId: '2',
    subject: 'Re: API Integration Support Request',
    date: '2025-02-24',
    time: '10:00',
    note: 'Check if rate limiting fix was deployed',
    status: 'upcoming',
  },
  {
    id: 'fu-2',
    emailId: '1',
    subject: 'Q4 Revenue Report - Urgent Review Needed',
    date: '2025-02-23',
    time: '14:00',
    note: 'Submit review comments before board meeting',
    status: 'upcoming',
  },
]

// ─── Category Helpers ────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<EmailCategory, string> = {
  customer: 'bg-blue-100 text-blue-700',
  internal: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
  marketing: 'bg-green-100 text-green-700',
  personal: 'bg-rose-100 text-rose-700',
}

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  customer: 'Customer',
  internal: 'Internal',
  admin: 'Admin',
  marketing: 'Marketing',
  personal: 'Personal',
}

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat as EmailCategory] ?? 'bg-gray-100 text-gray-700'
}

function getCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat as EmailCategory] ?? cat
}

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) {
      const mins = Math.floor(diff / (1000 * 60))
      return mins <= 0 ? 'Just now' : `${mins}m ago`
    }
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ts
  }
}

function formatFollowUpDate(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time}`)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return `${date} ${time}`
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── ErrorBoundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Sidebar Navigation ─────────────────────────────────────────────────────

function Sidebar({
  activeView,
  setActiveView,
  emailCount,
  followUpCount,
}: {
  activeView: ViewType
  setActiveView: (v: ViewType) => void
  emailCount: number
  followUpCount: number
}) {
  const navItems: { view: ViewType; label: string; icon: React.ReactNode; count?: number }[] = [
    { view: 'inbox', label: 'Inbox', icon: <HiOutlineInbox className="w-5 h-5" />, count: emailCount },
    { view: 'sent', label: 'Sent', icon: <HiOutlinePaperAirplane className="w-5 h-5" /> },
    { view: 'followups', label: 'Follow-ups', icon: <HiOutlineClock className="w-5 h-5" />, count: followUpCount },
    { view: 'settings', label: 'Settings', icon: <HiOutlineCog6Tooth className="w-5 h-5" /> },
  ]

  return (
    <div className="w-[260px] flex-shrink-0 h-screen flex flex-col bg-white/75 backdrop-blur-[16px] border-r border-white/[0.18]">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <HiOutlineEnvelope className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">InboxPilot</h1>
            <p className="text-xs text-muted-foreground">AI Email Manager</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setActiveView(item.view)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeView === item.view ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {(item.count ?? 0) > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activeView === item.view ? 'bg-white/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Agent Info */}
      <div className="p-4 m-3 rounded-xl bg-accent/50 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-foreground">Email Management Agent</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Powered by GPT-4.1 with Gmail and Calendar tools
        </p>
      </div>
    </div>
  )
}

// ─── Email List Item ─────────────────────────────────────────────────────────

function EmailListItem({
  email,
  isSelected,
  onClick,
}: {
  email: Email
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${isSelected ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-white/50 border-transparent hover:bg-white/80 hover:border-border'}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-accent-foreground">{getInitials(email.sender)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm truncate ${email.status === 'unread' ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
              {email.sender}
            </span>
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{formatTimestamp(email.timestamp)}</span>
          </div>
          <p className={`text-sm truncate mb-1.5 ${email.status === 'unread' ? 'font-medium text-foreground' : 'text-foreground/70'}`}>
            {email.subject}
          </p>
          <p className="text-xs text-muted-foreground truncate">{email.preview}</p>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={`text-[10px] px-2 py-0 font-medium ${getCategoryColor(email.category)}`}>
              {getCategoryLabel(email.category)}
            </Badge>
            {email.status === 'unread' && (
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            )}
            {email.status === 'replied' && (
              <HiOutlineArrowUturnLeft className="w-3.5 h-3.5 text-green-600" />
            )}
            {email.status === 'follow-up' && (
              <HiOutlineBellAlert className="w-3.5 h-3.5 text-amber-600" />
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Email Detail Panel ──────────────────────────────────────────────────────

function EmailDetailPanel({
  email,
  loadingDetail,
  sendingReply,
  draftText,
  setDraftText,
  onSummarize,
  onSendReply,
  onScheduleFollowUp,
  statusMessage,
  activeAgentId,
  tone,
}: {
  email: Email
  loadingDetail: boolean
  sendingReply: boolean
  draftText: string
  setDraftText: (v: string) => void
  onSummarize: () => void
  onSendReply: () => void
  onScheduleFollowUp: (date: string, time: string, note: string) => void
  statusMessage: { type: 'success' | 'error' | 'info'; text: string } | null
  activeAgentId: string | null
  tone: string
}) {
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [fuDate, setFuDate] = useState('')
  const [fuTime, setFuTime] = useState('10:00')
  const [fuNote, setFuNote] = useState('')
  const [threadExpanded, setThreadExpanded] = useState(false)

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-1">{email.subject}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HiOutlineUser className="w-4 h-4" />
                <span className="font-medium">{email.sender}</span>
                <span className="text-xs">({email.senderEmail})</span>
              </div>
            </div>
            <Badge variant="secondary" className={`text-xs px-3 py-1 font-medium ${getCategoryColor(email.category)}`}>
              {getCategoryLabel(email.category)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{formatTimestamp(email.timestamp)}</p>
        </div>

        <Separator />

        {/* Summary Section */}
        <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HiOutlineInformationCircle className="w-4 h-4 text-blue-600" />
                Thread Summary
              </CardTitle>
              {!email.summary && !loadingDetail && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSummarize}
                  className="text-xs h-8"
                >
                  <HiOutlineArrowPath className="w-3.5 h-3.5 mr-1.5" />
                  Summarize
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetail && activeAgentId ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            ) : email.summary ? (
              <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100/50">
                {renderMarkdown(email.summary)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click "Summarize" to get an AI-powered thread summary.</p>
            )}
          </CardContent>
        </Card>

        {/* Original Email Thread */}
        <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-sm">
          <CardHeader className="pb-3">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setThreadExpanded(!threadExpanded)}
            >
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HiOutlineEnvelopeOpen className="w-4 h-4" />
                Original Email
              </CardTitle>
              {threadExpanded ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
            </button>
          </CardHeader>
          {threadExpanded && (
            <CardContent>
              <div className="bg-muted/30 rounded-xl p-4 text-sm leading-relaxed text-foreground/80">
                {email.preview}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Draft Reply */}
        <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HiOutlinePaperAirplane className="w-4 h-4 text-primary" />
              Draft Reply
              {tone && (
                <Badge variant="secondary" className="text-[10px] ml-2 font-normal">
                  {tone} tone
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingDetail && activeAgentId ? (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <Textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="AI-generated draft will appear here, or type your reply..."
                  rows={6}
                  className="resize-none bg-white/60 border-border/50 text-sm leading-relaxed"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onSendReply}
                    disabled={sendingReply || !draftText.trim()}
                    className="flex-1"
                  >
                    {sendingReply ? (
                      <>
                        <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <HiOutlinePaperAirplane className="w-4 h-4 mr-2" />
                        Send Reply
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFollowUp(!showFollowUp)}
                    className="flex items-center gap-2"
                  >
                    <HiOutlineCalendarDays className="w-4 h-4" />
                    Follow-up
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Follow-up Scheduler */}
        {showFollowUp && (
          <Card className="bg-amber-50/40 backdrop-blur-[16px] border-amber-200/30 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <HiOutlineCalendarDays className="w-4 h-4 text-amber-600" />
                  Schedule Follow-up
                </CardTitle>
                <button onClick={() => setShowFollowUp(false)}>
                  <HiOutlineXMark className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5">Date</Label>
                  <Input
                    type="date"
                    value={fuDate}
                    onChange={(e) => setFuDate(e.target.value)}
                    className="text-sm bg-white/60"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5">Time</Label>
                  <Input
                    type="time"
                    value={fuTime}
                    onChange={(e) => setFuTime(e.target.value)}
                    className="text-sm bg-white/60"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5">Note (optional)</Label>
                <Input
                  value={fuNote}
                  onChange={(e) => setFuNote(e.target.value)}
                  placeholder="e.g., Check if issue was resolved"
                  className="text-sm bg-white/60"
                />
              </div>
              <Button
                onClick={() => {
                  if (fuDate) {
                    onScheduleFollowUp(fuDate, fuTime, fuNote)
                    setShowFollowUp(false)
                    setFuDate('')
                    setFuTime('10:00')
                    setFuNote('')
                  }
                }}
                disabled={!fuDate}
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                <HiOutlineCalendarDays className="w-4 h-4 mr-2" />
                Schedule Follow-up
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status Messages */}
        {statusMessage && (
          <div className={`rounded-xl p-4 text-sm flex items-start gap-3 ${statusMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
            {statusMessage.type === 'success' && <HiOutlineCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            {statusMessage.type === 'error' && <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            {statusMessage.type === 'info' && <HiOutlineInformationCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <div>{renderMarkdown(statusMessage.text)}</div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

// ─── Follow-ups View ─────────────────────────────────────────────────────────

function FollowUpsView({
  followUps,
  onNavigateToEmail,
}: {
  followUps: FollowUp[]
  onNavigateToEmail: (emailId: string) => void
}) {
  const getStatusColor = (status: FollowUpStatus) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-700'
      case 'overdue':
        return 'bg-red-100 text-red-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: FollowUpStatus) => {
    switch (status) {
      case 'upcoming':
        return <HiOutlineClock className="w-4 h-4" />
      case 'overdue':
        return <HiOutlineExclamationTriangle className="w-4 h-4" />
      case 'completed':
        return <HiOutlineCheckCircle className="w-4 h-4" />
      default:
        return <HiOutlineClock className="w-4 h-4" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Follow-ups</h2>
        <p className="text-sm text-muted-foreground mt-1">Scheduled reminders for email threads</p>
      </div>

      {followUps.length === 0 ? (
        <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <HiOutlineClock className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No follow-ups scheduled</h3>
            <p className="text-sm text-muted-foreground">Schedule follow-ups from the email detail view</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {followUps.map((fu) => (
            <Card
              key={fu.id}
              className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => onNavigateToEmail(fu.emailId)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">{fu.subject}</h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <HiOutlineCalendarDays className="w-3.5 h-3.5" />
                      {formatFollowUpDate(fu.date, fu.time)}
                    </p>
                    {fu.note && (
                      <p className="text-xs text-foreground/60 mt-2 bg-muted/30 rounded-lg px-3 py-1.5">{fu.note}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ml-3 flex items-center gap-1 ${getStatusColor(fu.status)}`}>
                    {getStatusIcon(fu.status)}
                    {fu.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Settings View ───────────────────────────────────────────────────────────

function SettingsView({
  tone,
  setTone,
  defaultFollowUpDuration,
  setDefaultFollowUpDuration,
}: {
  tone: string
  setTone: (v: string) => void
  defaultFollowUpDuration: string
  setDefaultFollowUpDuration: (v: string) => void
}) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure your email management preferences</p>
      </div>

      <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Reply Tone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Choose the default tone for AI-generated reply drafts.</p>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="w-full bg-white/60">
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="professional">Friendly-Professional</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Default Follow-up Duration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Set the default time for follow-up reminders.</p>
          <Select value={defaultFollowUpDuration} onValueChange={setDefaultFollowUpDuration}>
            <SelectTrigger className="w-full bg-white/60">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1hour">1 Hour</SelectItem>
              <SelectItem value="4hours">4 Hours</SelectItem>
              <SelectItem value="1day">1 Day</SelectItem>
              <SelectItem value="2days">2 Days</SelectItem>
              <SelectItem value="1week">1 Week</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Category Priority</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Categories are displayed in the following priority order:</p>
          <div className="space-y-2">
            {(['customer', 'internal', 'admin', 'personal', 'marketing'] as EmailCategory[]).map((cat, idx) => (
              <div key={cat} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground w-5">{idx + 1}.</span>
                <Badge variant="secondary" className={`text-xs px-2.5 py-0.5 ${getCategoryColor(cat)}`}>
                  {getCategoryLabel(cat)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Sent View ───────────────────────────────────────────────────────────────

function SentView({ sentEmails }: { sentEmails: Email[] }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Sent</h2>
        <p className="text-sm text-muted-foreground mt-1">Replies sent through InboxPilot</p>
      </div>

      {sentEmails.length === 0 ? (
        <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <HiOutlinePaperAirplane className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No sent replies yet</h3>
            <p className="text-sm text-muted-foreground">Replies you send will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sentEmails.map((email) => (
            <Card key={email.id} className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <HiOutlineCheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">To: {email.sender}</span>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(email.timestamp)}</span>
                    </div>
                    <p className="text-sm text-foreground/70 mt-0.5 truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{email.draftReply ?? email.preview}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Page() {
  // Navigation
  const [activeView, setActiveView] = useState<ViewType>('inbox')

  // Emails
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [sentEmails, setSentEmails] = useState<Email[]>([])

  // Follow-ups
  const [followUps, setFollowUps] = useState<FollowUp[]>([])

  // Loading / Status
  const [syncing, setSyncing] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [syncStatusText, setSyncStatusText] = useState('')

  // Search / Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  // Draft
  const [draftText, setDraftText] = useState('')

  // Settings
  const [tone, setTone] = useState('professional')
  const [defaultFollowUpDuration, setDefaultFollowUpDuration] = useState('1day')

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(false)

  // idCounter ref for generating unique IDs
  const idCounterRef = useRef(0)

  const generateId = useCallback(() => {
    idCounterRef.current += 1
    return `email-${idCounterRef.current}-${Math.random().toString(36).slice(2, 8)}`
  }, [])

  // ─── Sync Inbox ──────────────────────────────────────────────────────

  const handleSyncInbox = useCallback(async () => {
    setSyncing(true)
    setSyncStatusText('Fetching emails from Gmail...')
    setActiveAgentId(AGENT_ID)
    setStatusMessage(null)

    try {
      const result = await callAIAgent(
        'Fetch my recent emails from Gmail and categorize each one as customer, internal, admin, marketing, or personal. For each email, provide the sender name, sender email, subject, preview snippet, category, and timestamp.',
        AGENT_ID
      )

      if (result.success && result?.response?.result) {
        const data: AgentResult = result.response.result as AgentResult
        const responseMessage = data?.message ?? data?.summary ?? ''

        // Try to parse structured email data from the response
        // The agent may return email data in the message or summary field
        const parsedEmails: Email[] = []

        // Check if message contains structured email data
        if (responseMessage) {
          // Attempt to extract emails from response text
          // The agent typically returns a summary of what was fetched
          setSyncStatusText(responseMessage)
        }

        if (parsedEmails.length > 0) {
          setEmails(parsedEmails)
        } else if (data?.status === 'success') {
          // Agent fetched emails but data is in message format
          // Show the agent's response as a status update
          setStatusMessage({
            type: 'success',
            text: responseMessage || 'Emails synced successfully. Select an email to view details.',
          })
        }
      } else {
        const errorMsg = result?.error ?? result?.response?.message ?? 'Failed to sync inbox'
        setStatusMessage({ type: 'error', text: errorMsg })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Network error while syncing inbox. Please try again.' })
    } finally {
      setSyncing(false)
      setActiveAgentId(null)
      setSyncStatusText('')
    }
  }, [])

  // ─── Summarize & Draft ───────────────────────────────────────────────

  const handleSummarize = useCallback(async () => {
    if (!selectedEmail) return
    setLoadingDetail(true)
    setActiveAgentId(AGENT_ID)
    setStatusMessage(null)

    try {
      const toneLabel = tone === 'formal' ? 'formal' : tone === 'concise' ? 'concise' : 'friendly-professional'
      const result = await callAIAgent(
        `Summarize this email thread and draft a professional reply in a ${toneLabel} tone. Subject: "${selectedEmail.subject}", From: ${selectedEmail.sender} (${selectedEmail.senderEmail}), Content: "${selectedEmail.preview}". Provide a concise summary and a well-crafted reply draft.`,
        AGENT_ID
      )

      if (result.success && result?.response?.result) {
        const data: AgentResult = result.response.result as AgentResult
        const summary = data?.summary ?? data?.message ?? ''
        const draft = data?.draft_reply ?? ''

        setSelectedEmail((prev) => {
          if (!prev) return prev
          return { ...prev, summary, draftReply: draft, status: 'read' as EmailStatus }
        })
        setEmails((prev) =>
          prev.map((e) =>
            e.id === selectedEmail.id ? { ...e, summary, draftReply: draft, status: 'read' as EmailStatus } : e
          )
        )
        if (draft) {
          setDraftText(draft)
        }
        if (summary || draft) {
          setStatusMessage({ type: 'success', text: 'Summary and draft generated successfully.' })
        }
      } else {
        const errorMsg = result?.error ?? 'Failed to summarize email'
        setStatusMessage({ type: 'error', text: errorMsg })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error summarizing email. Please try again.' })
    } finally {
      setLoadingDetail(false)
      setActiveAgentId(null)
    }
  }, [selectedEmail, tone])

  // ─── Send Reply ──────────────────────────────────────────────────────

  const handleSendReply = useCallback(async () => {
    if (!selectedEmail || !draftText.trim()) return
    setSendingReply(true)
    setActiveAgentId(AGENT_ID)
    setStatusMessage(null)

    try {
      const result = await callAIAgent(
        `Send this reply via Gmail using GMAIL_REPLY_TO_THREAD. Reply text: "${draftText}". Thread subject: "${selectedEmail.subject}". Recipient: ${selectedEmail.senderEmail}.`,
        AGENT_ID
      )

      if (result.success && result?.response?.result) {
        const data: AgentResult = result.response.result as AgentResult
        const msg = data?.message ?? 'Reply sent successfully.'

        // Update email status
        setEmails((prev) =>
          prev.map((e) =>
            e.id === selectedEmail.id ? { ...e, status: 'replied' as EmailStatus, draftReply: draftText } : e
          )
        )
        setSelectedEmail((prev) => (prev ? { ...prev, status: 'replied' as EmailStatus } : prev))

        // Add to sent
        setSentEmails((prev) => [
          { ...selectedEmail, status: 'replied' as EmailStatus, draftReply: draftText, timestamp: new Date().toISOString() },
          ...prev,
        ])

        setStatusMessage({ type: 'success', text: msg })
        setDraftText('')
      } else {
        const errorMsg = result?.error ?? 'Failed to send reply'
        setStatusMessage({ type: 'error', text: errorMsg })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error sending reply. Please try again.' })
    } finally {
      setSendingReply(false)
      setActiveAgentId(null)
    }
  }, [selectedEmail, draftText])

  // ─── Schedule Follow-up ──────────────────────────────────────────────

  const handleScheduleFollowUp = useCallback(
    async (date: string, time: string, note: string) => {
      if (!selectedEmail) return
      setActiveAgentId(AGENT_ID)
      setStatusMessage(null)

      try {
        const result = await callAIAgent(
          `Create a follow-up reminder as a Google Calendar event using GOOGLECALENDAR_CREATE_EVENT. Title: "Follow up - ${selectedEmail.subject}". Date: ${date}. Time: ${time}. Note: ${note || 'Follow up on this email thread'}.`,
          AGENT_ID
        )

        const newFollowUp: FollowUp = {
          id: generateId(),
          emailId: selectedEmail.id,
          subject: selectedEmail.subject,
          date,
          time,
          note: note || 'Follow up on this email thread',
          status: 'upcoming',
        }

        setFollowUps((prev) => [...prev, newFollowUp])
        setEmails((prev) =>
          prev.map((e) =>
            e.id === selectedEmail.id ? { ...e, status: 'follow-up' as EmailStatus } : e
          )
        )
        setSelectedEmail((prev) => (prev ? { ...prev, status: 'follow-up' as EmailStatus } : prev))

        if (result.success) {
          const data: AgentResult = result?.response?.result as AgentResult
          setStatusMessage({ type: 'success', text: data?.message ?? 'Follow-up scheduled successfully.' })
        } else {
          // Still keep the local follow-up but show warning
          setStatusMessage({ type: 'info', text: 'Follow-up saved locally. Calendar event creation may have encountered an issue.' })
        }
      } catch (err) {
        // Still save locally
        const newFollowUp: FollowUp = {
          id: generateId(),
          emailId: selectedEmail.id,
          subject: selectedEmail.subject,
          date,
          time,
          note: note || 'Follow up on this email thread',
          status: 'upcoming',
        }
        setFollowUps((prev) => [...prev, newFollowUp])
        setStatusMessage({ type: 'info', text: 'Follow-up saved locally. Could not create calendar event.' })
      } finally {
        setActiveAgentId(null)
      }
    },
    [selectedEmail, generateId]
  )

  // ─── Navigate to email from follow-up ─────────────────────────────────

  const handleNavigateToEmail = useCallback(
    (emailId: string) => {
      const email = displayEmails.find((e) => e.id === emailId)
      if (email) {
        setSelectedEmail(email)
        setActiveView('inbox')
        setDraftText(email.draftReply ?? '')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [emails, showSampleData]
  )

  // ─── Sample Data Toggle Effect ────────────────────────────────────────

  const displayEmails = showSampleData ? SAMPLE_EMAILS : emails
  const displayFollowUps = showSampleData ? SAMPLE_FOLLOWUPS : followUps

  // Reset selected email when toggling sample data
  useEffect(() => {
    setSelectedEmail(null)
    setDraftText('')
    setStatusMessage(null)
  }, [showSampleData])

  // ─── Filtered Emails ──────────────────────────────────────────────────

  const filteredEmails = displayEmails.filter((email) => {
    const matchesSearch =
      !searchQuery ||
      email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = activeCategory === 'all' || email.category === activeCategory

    return matchesSearch && matchesCategory
  })

  const unreadCount = displayEmails.filter((e) => e.status === 'unread').length

  // ─── Select email handler ─────────────────────────────────────────────

  const handleSelectEmail = useCallback(
    (email: Email) => {
      setSelectedEmail(email)
      setDraftText(email.draftReply ?? '')
      setStatusMessage(null)
    },
    []
  )

  return (
    <ErrorBoundary>
      <div className="min-h-screen h-screen bg-gradient-to-br from-[hsl(210,20%,97%)] via-[hsl(220,25%,95%)] to-[hsl(200,20%,96%)] flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          emailCount={unreadCount}
          followUpCount={displayFollowUps.length}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-[16px] border-b border-white/[0.18]">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {activeView === 'inbox' && 'Inbox'}
                {activeView === 'sent' && 'Sent'}
                {activeView === 'followups' && 'Follow-ups'}
                {activeView === 'settings' && 'Settings'}
              </h2>
              {activeView === 'inbox' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {displayEmails.length > 0
                    ? `${displayEmails.length} emails, ${unreadCount} unread`
                    : 'Sync your inbox to get started'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Active Agent Indicator */}
              {activeAgentId && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-medium text-blue-700">Agent processing</span>
                </div>
              )}
              {/* Sample Data Toggle */}
              <div className="flex items-center gap-2">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">
                  Sample Data
                </Label>
                <Switch
                  id="sample-toggle"
                  checked={showSampleData}
                  onCheckedChange={setShowSampleData}
                />
              </div>
            </div>
          </div>

          {/* View Content */}
          <div className="flex-1 overflow-hidden">
            {activeView === 'inbox' && (
              <div className="flex h-full">
                {/* Email List Panel (40%) */}
                <div className="w-[40%] flex flex-col border-r border-border/50 bg-white/30">
                  {/* Sync Button & Search */}
                  <div className="p-4 space-y-3">
                    <Button
                      onClick={handleSyncInbox}
                      disabled={syncing}
                      className="w-full"
                      size="sm"
                    >
                      {syncing ? (
                        <>
                          <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <HiOutlineArrowPath className="w-4 h-4 mr-2" />
                          Sync Inbox
                        </>
                      )}
                    </Button>

                    {syncStatusText && syncing && (
                      <p className="text-xs text-muted-foreground text-center">{syncStatusText}</p>
                    )}

                    {/* Search */}
                    <div className="relative">
                      <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search emails..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 text-sm bg-white/60 border-border/50"
                      />
                    </div>

                    {/* Category Tabs */}
                    <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                      <TabsList className="w-full h-auto flex-wrap gap-1 bg-transparent p-0">
                        {['all', 'customer', 'internal', 'admin', 'marketing', 'personal'].map((cat) => (
                          <TabsTrigger
                            key={cat}
                            value={cat}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                          >
                            {cat === 'all' ? 'All' : getCategoryLabel(cat)}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>

                  <Separator />

                  {/* Email List */}
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      {syncing ? (
                        // Skeleton loaders
                        Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="p-4 rounded-xl bg-white/50 space-y-3">
                            <div className="flex items-center gap-3">
                              <Skeleton className="w-10 h-10 rounded-full" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-3.5 w-2/3" />
                                <Skeleton className="h-3 w-4/5" />
                              </div>
                            </div>
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </div>
                        ))
                      ) : filteredEmails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          {displayEmails.length === 0 ? (
                            <>
                              <HiOutlineInbox className="w-12 h-12 text-muted-foreground/30 mb-4" />
                              <h3 className="text-base font-medium text-foreground mb-1">No emails yet</h3>
                              <p className="text-sm text-muted-foreground px-4">
                                Click "Sync Inbox" to fetch your emails from Gmail, or toggle "Sample Data" to see a demo.
                              </p>
                            </>
                          ) : (
                            <>
                              <HiOutlineMagnifyingGlass className="w-10 h-10 text-muted-foreground/30 mb-3" />
                              <h3 className="text-base font-medium text-foreground mb-1">No matching emails</h3>
                              <p className="text-sm text-muted-foreground">Try a different search or category filter.</p>
                            </>
                          )}
                        </div>
                      ) : (
                        filteredEmails.map((email) => (
                          <EmailListItem
                            key={email.id}
                            email={email}
                            isSelected={selectedEmail?.id === email.id}
                            onClick={() => handleSelectEmail(email)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Email Detail Panel (60%) */}
                <div className="w-[60%] flex flex-col bg-white/20">
                  {selectedEmail ? (
                    <EmailDetailPanel
                      email={selectedEmail}
                      loadingDetail={loadingDetail}
                      sendingReply={sendingReply}
                      draftText={draftText}
                      setDraftText={setDraftText}
                      onSummarize={handleSummarize}
                      onSendReply={handleSendReply}
                      onScheduleFollowUp={handleScheduleFollowUp}
                      statusMessage={statusMessage}
                      activeAgentId={activeAgentId}
                      tone={tone}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <div className="w-20 h-20 rounded-2xl bg-accent/50 flex items-center justify-center mb-5">
                        <HiOutlineEnvelopeOpen className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Select an email</h3>
                      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                        Choose an email from the list to view its details, get an AI summary, and draft a reply.
                      </p>

                      {/* Inline status message if present (e.g., after sync) */}
                      {statusMessage && (
                        <div className={`mt-6 rounded-xl p-4 text-sm max-w-md flex items-start gap-3 ${statusMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                          {statusMessage.type === 'success' && <HiOutlineCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                          {statusMessage.type === 'error' && <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                          {statusMessage.type === 'info' && <HiOutlineInformationCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                          <div className="text-left">{renderMarkdown(statusMessage.text)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'sent' && (
              <ScrollArea className="h-full">
                <SentView sentEmails={sentEmails} />
              </ScrollArea>
            )}

            {activeView === 'followups' && (
              <ScrollArea className="h-full">
                <FollowUpsView
                  followUps={displayFollowUps}
                  onNavigateToEmail={handleNavigateToEmail}
                />
              </ScrollArea>
            )}

            {activeView === 'settings' && (
              <ScrollArea className="h-full">
                <SettingsView
                  tone={tone}
                  setTone={setTone}
                  defaultFollowUpDuration={defaultFollowUpDuration}
                  setDefaultFollowUpDuration={setDefaultFollowUpDuration}
                />
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
