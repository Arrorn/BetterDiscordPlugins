/**
 * @name DisplayUsernames
 * @source https://github.com/HudsonGTV/BetterDiscordPlugins/blob/main/DisplayUsername/DisplayUsername.plugin.js
 * @author HG
 * @authorId 124667638298181632
 * @description Displays Discord handle next to display names in chat and adds '@' symbol in profile cards.
 * @version 1.1.0
 * @website https://hudsongreen.com/
 * @invite https://discord.gg/H3bebA97tV
 * @donate https://www.paypal.com/donate/?business=REFHYLZAZUWHJ
 */
 
const request = require("request");
const fs = require("fs");
const path = require("path");

const config = {
	info: {
		name: "DisplayUsernames",
		authors: [
			{	
				name: "HG",
				discord_id: "124667638298181632",
				github_username: "HudsonGTV",
				twitter_username: "HudsonKazuto"
			}
		],
		version: "1.1.0",
		description: "Displays Discord handle next to display names in chat and adds '`@`' symbol in profile cards.",
		github: "https://github.com/HudsonGTV/BetterDiscordPlugins/blob/main/DisplayUsername/DisplayUsername.plugin.js",
		github_raw: "https://raw.githubusercontent.com/HudsonGTV/BetterDiscordPlugins/main/DisplayUsername/DisplayUsername.plugin.js"
	},
	changelog: [
		/*{
			title: "Fixes",
			type: "fixed",
			items: [
				"Fixed visual bug causing the wrong seperator to appear in replies.",
				"Fixed visual bug causing the wrong info to appear when user excecuted a slash command."
			]
		},*/
		{
			title: "Additions",
			type: "added",
			items: [
				"Added the ability to configure plugin (restart required for changes to go into effect, until I can figure out how to auto apply them)."
			]
		},
		/*{
			title: "Improvements",
			type: "improved",
			items: [
				""
			]
		}*/
	],
	defaultConfig: [
		{
			type: "textbox",
			id: "handlesymbol",
			name: "Username Handle Prefix Symbol",
			note: "The symbol used as a prefix for usernames (the @ in @username).",
			placeholder: "Blank for none; default: @",
			value: "@"
		},
		{
			type: "switch",
			id: "usernamechat",
			name: "Show Username In Chat",
			note: "Display the message author's username next to the message timestamp.",
			value: true
		},
		{
			type: "switch",
			id: "profilecard",
			name: "Show Handle Prefix In Profile Card & Friends List",
			note: "Display the username handle prefix in profile cards/popups as well as the friends list.",
			value: true
		},
		{
			type: "switch",
			id: "friendslist",
			name: "Always Show Friends List Username",
			note: "Force Discord to always display usernames next to display names in friends list. Turn off for default Discord behavior (only show on hover).",
			value: true
		}
	]
};

module.exports = !global.ZeresPluginLibrary ? class {
	
	constructor() {
		this._config = config;
	}
	
	load() {
		BdApi.showConfirmationModal("Library plugin is needed",
			`The library plugin needed for ZeresPluginLibrary is missing. Please click Download Now to install it.`, {
			confirmText: "Download",
			cancelText: "Cancel",
			onConfirm: () => {
				request.get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", (error, response, body) => {
					if (error)
						return electron.shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");

					fs.writeFileSync(path.join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body);
				});
			}
		});
	}
	
	start() { }
	stop() { }
	
} : (([Plugin, Library]) => {
	
	const { DiscordModules, WebpackModules, Patcher, PluginUtilities } = Library;
	const { React } = DiscordModules;
	
	class plugin extends Plugin {
		
		constructor() {
			super();
		}


		onStart() {
			
			// Apply CSS Styles
			this.applyStyles();
			
			// Apply usernames
			this.applyUsername();
			
		}

		onStop() {
			Patcher.unpatchAll();
			PluginUtilities.removeStyle("DisplayUsernames-ChatMessage");
			PluginUtilities.removeStyle("DisplayUsernames-ProfileCard");
			PluginUtilities.removeStyle("DisplayUsernames-FriendsList");
		}
		
		getSettingsPanel() {
			return this.buildSettingsPanel().getElement();
		}
		
		applyStyles() {
			// Chat message username styles (required - configured via applyUsername())
			PluginUtilities.addStyle(
				"DisplayUsernames-ChatMessage", 
				`
				/* style username in messages */
				.hg-username-handle {
					margin-left: 0.25rem;
					font-size: 0.75rem;
				}
				/* seperator dot */
				.hg-username-handle::after {
					margin-left: 0.25rem;
					content: "•";
				}
				/* fix timestamp margin (discord likes to change it randomly) */
				.compact-2Nkcau .headerText-2z4IhQ, .cozy-VmLDNB .headerText-2z4IhQ, .roleDot-PzIfeF {
					margin-right: 0 !important;
				}
				/* change seperator in replies */
				.repliedMessage-3Z6XBG > .hg-username-handle::after {
					margin-left: 0;
					content: ":  ";
				}
				/* hide username in command replies */
				.executedCommand-14-SNW > .hg-username-handle {
					display: none;
				}
				`
			);
			// Display handle symbol infront of username in profile card/friends list
			if(this.settings.profilecard) PluginUtilities.addStyle(
				"DisplayUsernames-ProfileCard",
				`
				/* display handle symbol infront of username */
				.info-3ddo6z > span::before {
					color: #777;
					content: "${this.settings.handlesymbol}";
				}
				/* hide handle symbol infront of nick in friends list */
				.username-Qpc78p::before {
					content: "" !important;
				}
				`
			);
			// Always display usernames in friends list
			if(this.settings.friendslist) PluginUtilities.addStyle(
				"DisplayUsernames-FriendsList",
				`
				/* always show username in friends list */
				.discriminator-WV5K5s {
					visibility: visible;
				}
				`
			);
		}
		
		applyUsername() {
			
			// Check if user disabled chat usernames
			if(!this.settings.usernamechat) return;
			
			const [ module, key ] = BdApi.Webpack.getWithKey(BdApi.Webpack.Filters.byStrings("userOverride", "withMentionPrefix"), { searchExports: false });
			
			Patcher.after(module, key, (_, args, ret) => {
				let author = args[0].message.author;
				let discrim = author.discriminator;
				ret.props.children.push(
					React.createElement("span", { class: "hg-username-handle" }, this.settings.handlesymbol + author.username + (discrim != "0" ? "#" + discrim : ""))
				);
			});
			
		}
		
	}
	
	return plugin;
	
})(global.ZeresPluginLibrary.buildPlugin(config));
