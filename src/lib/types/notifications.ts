export type PopupNotification = {
    id: string;
    type: 'chat' | 'appointment' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    link?: string;
    icon?: string;
    read?: boolean;
    color?: string;
};
