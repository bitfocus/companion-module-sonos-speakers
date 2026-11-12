## SONOS

Control Sonos speakers on your network. Enter the IP address of any one Sonos speaker, and the module discovers the rest.

**Actions**

- Playback: play/pause, stop, next/previous, seek, repeat, shuffle, crossfade, sleep timer
- Queue: play a queue track, clear the queue, remove the current track, switch to the queue
- Inputs: line-in, TV (soundbars), load a stream URI
- Favourites and radio: play a Sonos favourite or TuneIn radio station (loaded when the module connects, use _Refresh favourites, stations and alarms_ after changing them)
- Volume: set/adjust volume, mute, ramp volume, group volume, group mute
- Grouping: join group, leave group, party mode, transfer playback
- Alarms: enable/disable, snooze
- Sound: bass, treble, loudness, balance, night mode, speech enhancement, subwoofer and surround settings (depending on the speaker)

**Feedbacks**

- Playing, paused, stopped, muted, volume, repeat mode, shuffle, grouped, group coordinator

**Variables** (per speaker)

- `name`, `group`, `group_members`, `is_coordinator`
- `volume` (number), `volume_text`, `muted`, `state`
- `repeat`, `shuffle`
- `streamUri`, `track_title`, `track_artist`, `track_album`, `album_art`

Variables can be used in expressions and in action options, for example to build buttons that show the current track.

**Notes**

- Speakers push changes to Companion, which can be blocked by a firewall or by picking the wrong network connection. The module also reads the status of the speakers every few seconds (see _Status refresh interval_), and logs a warning when updates are not arriving. If this computer has several network connections, set _Network interface for speaker updates_ to the one on the same network as the speakers.
- Commands for a speaker which is part of a group (play, pause, seek, queue, favourites) are sent to the group coordinator.
- Playing a favourite which is an album or playlist replaces the queue, like it does in the Sonos app.
