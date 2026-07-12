declare global {
    type PulseMusicProgress<T = object> = {
        stage: string;
    } & T;

    type PulseMusicProgressMessage<_T = PulseMusicProgress> = {
        message: string;
    };

    type PulseMusicProgressListener<T = PulseMusicProgress> = (progress: T) => void;
}

export class DownloadProgress implements PulseMusicProgress {
    public readonly stage = 'downloading';

    constructor(
        public readonly receivedBytes: number,
        public readonly totalBytes: number | undefined
    ) {}
}

export class SegmentedDownloadProgress extends DownloadProgress {
    public readonly stage = 'downloading';

    constructor(
        public readonly receivedBytes: number,
        public readonly totalBytes: number | undefined,
        public readonly currentSegment: number,
        public readonly totalSegments: number
    ) {
        super(receivedBytes, totalBytes);
    }
}

export class ProgressMessage implements PulseMusicProgressMessage {
    constructor(public readonly message: string) {}
}

export class DownloadProgressMessage extends ProgressMessage {
    constructor(message: string) {
        super(message);
    }
}
