export enum PlayPauseToggle {
	Play = 'play',
	Pause = 'pause',
	Toggle = 'toggle',
}

export enum ActionId {
	// Playback
	PlayPause = 'play_pause',
	Stop = 'stop',
	NextTrack = 'next_track',
	PreviousTrack = 'previous_track',
	Seek = 'seek',
	SeekRelative = 'seek_relative',
	Repeat = 'repeat',
	Shuffle = 'shuffle',
	Crossfade = 'crossfade',
	SwitchToQueue = 'switch_to_queue',
	PlayQueueTrack = 'play_queue_track',
	ClearQueue = 'clear_queue',
	RemoveCurrentFromQueue = 'remove_current_from_queue',
	LineIn = 'line_in',
	SwitchToTv = 'switch_to_tv',
	LoadStreamUri = 'load_stream_uri',

	// Volume
	Mute = 'mute',
	Volume = 'volume',
	VolumeDelta = 'volume_delta',
	RampVolume = 'ramp_volume',
	GroupVolume = 'group_volume',
	GroupVolumeDelta = 'group_volume_delta',
	GroupMute = 'group_mute',

	// Favourites, sleep timer and alarms
	PlayFavourite = 'play_favourite',
	PlayRadioStation = 'play_radio_station',
	RefreshLists = 'refresh_lists',
	SleepTimer = 'sleep_timer',
	AlarmEnabled = 'alarm_enabled',
	SnoozeAlarm = 'snooze_alarm',

	// Grouping
	JoinGroup = 'join_group',
	Ungroup = 'ungroup',
	PartyMode = 'party_mode',
	TransferPlayback = 'transfer_playback',

	// EQ and home theatre
	Bass = 'bass',
	Treble = 'treble',
	Loudness = 'loudness',
	Balance = 'balance',
	NightMode = 'night_mode',
	SpeechEnhancement = 'speech_enhancement',
	SubEnabled = 'sub_enabled',
	SubGain = 'sub_gain',
	SurroundEnabled = 'surround_enabled',
	SurroundVolumeTv = 'surround_volume_tv',
	SurroundVolumeMusic = 'surround_volume_music',
	SurroundFullVolume = 'surround_full_volume',
}
