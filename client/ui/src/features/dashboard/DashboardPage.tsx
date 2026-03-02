import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout.js';
import { routes } from '../../routes/index.js';
import './DashboardPage.scss';

interface StatCard {
  icon: string;
  value: number;
  label: string;
}

interface RecentDoc {
  id: string;
  title: string;
  updatedAt: string;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
}

const STATS: StatCard[] = [
  { icon: '📄', value: 24, label: 'Specs' },
  { icon: '📁', value: 8, label: 'Documents' },
  { icon: '🔗', value: 42, label: 'Edges' },
  { icon: '🕐', value: 7, label: 'Active Today' },
];

const RECENT_DOCS: RecentDoc[] = [
  { id: '1', title: 'Authentication Flow', updatedAt: '2 hours ago' },
  { id: '2', title: 'API Gateway Design', updatedAt: '5 hours ago' },
  { id: '3', title: 'Data Model v2', updatedAt: 'Yesterday' },
  { id: '4', title: 'Deployment Pipeline', updatedAt: '2 days ago' },
  { id: '5', title: 'Security Audit Checklist', updatedAt: '3 days ago' },
];

const ACTIVITY: ActivityItem[] = [
  { id: '1', text: 'Updated "Authentication Flow" spec', time: '2 hours ago' },
  { id: '2', text: 'Created edge: Auth → API Gateway', time: '3 hours ago' },
  { id: '3', text: 'Added snapshot "pre-refactor"', time: '5 hours ago' },
  { id: '4', text: 'Merged branch kg/auth-refactor', time: 'Yesterday' },
  { id: '5', text: 'Created "Data Model v2" document', time: 'Yesterday' },
];

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="DashboardPage">
        <div className="DashboardPage__welcome">
          <h1 className="DashboardPage__welcomeTitle">Welcome back</h1>
          <p className="DashboardPage__welcomeSubtitle">
            Here&apos;s what&apos;s happening in your knowledge graph.
          </p>
        </div>

        <div className="DashboardPage__stats">
          {STATS.map((stat) => (
            <div key={stat.label} className="DashboardPage__statCard">
              <span className="DashboardPage__statIcon">{stat.icon}</span>
              <span className="DashboardPage__statValue">{stat.value}</span>
              <span className="DashboardPage__statLabel">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="DashboardPage__section">
          <h2 className="DashboardPage__sectionTitle">Quick Actions</h2>
          <div className="DashboardPage__actions">
            <button
              className="DashboardPage__actionBtn"
              type="button"
              onClick={() => navigate(routes.documents)}
            >
              <span className="DashboardPage__actionIcon">📝</span>
              <span className="DashboardPage__actionLabel">New Document</span>
            </button>
            <button
              className="DashboardPage__actionBtn"
              type="button"
              onClick={() => navigate(routes.graph)}
            >
              <span className="DashboardPage__actionIcon">🔍</span>
              <span className="DashboardPage__actionLabel">Open Graph</span>
            </button>
            <button
              className="DashboardPage__actionBtn"
              type="button"
              onClick={() => navigate(routes.chat)}
            >
              <span className="DashboardPage__actionIcon">💬</span>
              <span className="DashboardPage__actionLabel">Start Chat</span>
            </button>
          </div>
        </div>

        <div className="DashboardPage__grid">
          <div className="DashboardPage__section">
            <h2 className="DashboardPage__sectionTitle">Recent Documents</h2>
            <div className="DashboardPage__recent">
              {RECENT_DOCS.map((doc) => (
                <div
                  key={doc.id}
                  className="DashboardPage__recentItem"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(routes.documents)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(routes.documents);
                  }}
                >
                  <span className="DashboardPage__recentTitle">
                    {doc.title}
                  </span>
                  <span className="DashboardPage__recentDate">
                    {doc.updatedAt}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="DashboardPage__section">
            <h2 className="DashboardPage__sectionTitle">Recent Activity</h2>
            <div className="DashboardPage__activity">
              {ACTIVITY.map((item) => (
                <div key={item.id} className="DashboardPage__activityItem">
                  <span className="DashboardPage__activityDot" />
                  <div className="DashboardPage__activityContent">
                    <span className="DashboardPage__activityText">
                      {item.text}
                    </span>
                    <span className="DashboardPage__activityTime">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
