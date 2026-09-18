import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'project-overview',
      label: 'Overview',
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/roles',
        'concepts/terminology',
        'concepts/work-order-lifecycle',
      ],
    },
    {
      type: 'category',
      label: 'User Journeys',
      items: [
        {
          type: 'doc',
          id: 'user-journeys/README',
          label: 'Overview',
        },
        {
          type: 'category',
          label: 'Work Orders',
          items: [
            'user-journeys/work-orders/create-planned-work-order',
            'user-journeys/work-orders/create-tank-mix-work-order',
            'user-journeys/work-orders/create-inspection-work-order',
            'user-journeys/work-orders/create-harvest-work-order',
            'user-journeys/work-orders/approve-work-order',
          ],
        },
        {
          type: 'category',
          label: 'Templates',
          items: [
            'user-journeys/templates/create-attribute-template',
            'user-journeys/templates/create-inspection-template',
            'user-journeys/templates/enable-clone-inspection-template',
            'user-journeys/templates/create-material-template',
          ],
        },
        {
          type: 'category',
          label: 'Observations & Maps',
          items: [
            'user-journeys/observations/configure-poi-categories',
            'user-journeys/observations/create-work-order-from-observation',
          ],
        },
        {
          type: 'category',
          label: 'Communication',
          items: [
            'user-journeys/communication/chat-and-communications',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Diagrams',
      items: [
        {
          type: 'doc',
          id: 'diagrams/README',
          label: 'Overview',
        },
        'diagrams/web-mobile-web',
        'diagrams/work-order-create-flow',
        'diagrams/work-order-approval',
      ],
    },
    {
      type: 'category',
      label: 'Administration',
      items: [
        'administration/set-up-users-roles-groups',
        'administration/create-resources',
        'administration/create-resource-groups',
      ],
    },
    {
      type: 'category',
      label: 'Finance & Journals',
      items: [
        'finance/review-postings',
        'finance/review-transfer-journals',
        'finance/review-return-item-journal',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing/documentation-guidelines',
      ],
    },
  ],
};

export default sidebars;
