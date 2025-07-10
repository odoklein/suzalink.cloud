# Dashboard Redesign Wireframe

## New Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Header (Search + Profile)                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    Key Metrics Grid (2x2)                             │ │
│  │                                                                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │   Prospects │  │    Clients  │  │    Income   │  │   Expenses  │   │ │
│  │  │     156     │  │     89      │  │   $12,450   │  │    $8,230   │   │ │
│  │  │   +12% ↑    │  │    +5% ↑    │  │   +23% ↑    │  │   +8% ↑     │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    Balance Card                                    │ │ │
│  │  │                         $4,220                                    │ │ │
│  │  │                      This Month                                    │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    Charts Section                                     │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    Income vs Expenses Chart                        │ │ │
│  │  │                                                                     │ │ │
│  │  │  [Bar Chart showing monthly trends]                               │ │ │
│  │  │                                                                     │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    Quick Actions                                      │ │
│  │                                                                         │ │
│  │  [New Project] [Invite Team] [Upload File] [View Reports]             │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    Recent Activity                                    │ │
│  │                                                                         │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                      │ │
│  │  │   Recent Projects   │  │   Recent Clients    │                      │ │
│  │  │                     │  │                     │                      │ │
│  │  │ • Project Alpha     │  │ • Client A          │                      │ │
│  │  │ • Project Beta      │  │ • Client B          │                      │ │
│  │  │ • Project Gamma     │  │ • Client C          │                      │ │
│  │  └─────────────────────┘  └─────────────────────┘                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Card Design Specifications

### Metrics Cards (4 cards)
- **Size**: Equal width, responsive (1 col mobile, 2 col tablet, 4 col desktop)
- **Content**: Icon + Large number + Label + Trend indicator
- **Colors**: 
  - Prospects: Blue theme
  - Clients: Green theme  
  - Income: Purple theme
  - Expenses: Orange theme

### Balance Card (1 card, full width)
- **Size**: Full width below metrics grid
- **Content**: Large balance amount + "This Month" label
- **Color**: Green theme (positive balance)

### Charts Section
- **Size**: Full width
- **Content**: Bar chart showing income vs expenses over time
- **Height**: 300px minimum

### Quick Actions
- **Style**: Horizontal button row
- **Colors**: Match existing button styles with rounded corners

### Recent Activity
- **Layout**: 2-column grid
- **Content**: Recent projects and clients lists

## Responsive Behavior

### Mobile (1 column)
```
┌─────────────┐
│  Prospects  │
│    156      │
└─────────────┘
┌─────────────┐
│   Clients   │
│     89      │
└─────────────┘
┌─────────────┐
│   Income    │
│  $12,450    │
└─────────────┘
┌─────────────┐
│  Expenses   │
│   $8,230    │
└─────────────┘
```

### Tablet (2 columns)
```
┌─────────────┐ ┌─────────────┐
│  Prospects  │ │   Clients   │
│    156      │ │     89      │
└─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐
│   Income    │ │  Expenses   │
│  $12,450    │ │   $8,230    │
└─────────────┘ └─────────────┘
```

### Desktop (4 columns)
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Prospects  │ │   Clients   │ │   Income    │ │  Expenses   │
│    156      │ │     89      │ │  $12,450    │ │   $8,230    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## Color Scheme
- **Background**: White cards on light purple background
- **Prospects**: Blue accent (#3B82F6)
- **Clients**: Green accent (#10B981) 
- **Income**: Purple accent (#8B5CF6)
- **Expenses**: Orange accent (#F59E0B)
- **Balance**: Green accent (#10B981)
- **Charts**: Neutral grays with accent colors for data 