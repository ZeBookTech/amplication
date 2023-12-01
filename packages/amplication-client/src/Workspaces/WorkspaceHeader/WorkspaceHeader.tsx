import {
  Breadcrumbs,
  ButtonProgress,
  Dialog,
  Icon,
  SelectMenu,
  SelectMenuItem,
  SelectMenuList,
  SelectMenuModal,
  Tooltip,
} from "@amplication/ui/design-system";
import { useApolloClient } from "@apollo/client";
import {
  ButtonTypeEnum,
  IMessage,
  NotificationBell,
  NovuProvider,
  PopoverNotificationCenter,
} from "@novu/notification-center";
import { PricingType, useStiggContext } from "@stigg/react-sdk";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { isMacOs } from "react-device-detect";
import { Link, useHistory } from "react-router-dom";
import CommandPalette from "../../CommandPalette/CommandPalette";
import { Button, EnumButtonStyle } from "../../Components/Button";
import UserBadge from "../../Components/UserBadge";
import BreadcrumbsContext from "../../Layout/BreadcrumbsContext";
import ProfileForm from "../../Profile/ProfileForm";
import { unsetToken } from "../../authentication/authentication";
import { AppContext } from "../../context/appContext";
import {
  NX_REACT_APP_AUTH_LOGOUT_URI,
  NX_REACT_APP_NOVU_IDENTIFIER,
} from "../../env";
import { BillingPlan } from "../../util/BillingPlan";
import { BillingFeature } from "../../util/BillingFeature";
import { useTracking } from "../../util/analytics";
import { AnalyticsEventNames } from "../../util/analytics-events.types";
import {
  AMPLICATION_DISCORD_URL,
  AMPLICATION_DOC_URL,
} from "../../util/constants";
import { version } from "../../util/version";
import GitHubBanner from "./GitHubBanner";
import "./WorkspaceHeader.scss";

const ONE_DAY = 1000 * 60 * 60 * 24;

const CLASS_NAME = "workspace-header";
export { CLASS_NAME as WORK_SPACE_HEADER_CLASS_NAME };
export const PROJECT_CONFIGURATION_RESOURCE_NAME = "Project Configuration";

enum ItemDataCommand {
  COMMAND_CONTACT_US = "command_contact_us",
}

type HelpMenuItem = {
  name: string;
  url: string | null;
  itemData: ItemDataCommand | null;
};

const HELP_MENU_LIST: HelpMenuItem[] = [
  { name: "Docs", url: AMPLICATION_DOC_URL, itemData: null },
  {
    name: "Technical Support",
    url: AMPLICATION_DISCORD_URL,
    itemData: null,
  },
  {
    name: "Contact Us",
    url: null,
    itemData: ItemDataCommand.COMMAND_CONTACT_US,
  },
];

const WorkspaceHeader: React.FC = () => {
  const { currentWorkspace, currentProject, openHubSpotChat } =
    useContext(AppContext);
  const apolloClient = useApolloClient();
  const history = useHistory();
  const { stigg } = useStiggContext();
  const { trackEvent } = useTracking();

  const breadcrumbsContext = useContext(BreadcrumbsContext);

  const [versionAlert, setVersionAlert] = useState(false);

  const [upgradeButtonData, setUpgradeButtonData] = useState<{
    trialDaysLeft?: number;
    trialLeftProgress?: number;
    showUpgradeTrialButton: boolean;
    showUpgradeDefaultButton?: boolean;
  }>({ showUpgradeTrialButton: false });

  const getCurrentSubscription = useCallback(async () => {
    if (currentWorkspace) {
      await stigg.setCustomerId(currentWorkspace.id);
      const customer = await stigg.getCustomer();
      const [subscription] = await stigg.getActiveSubscriptions();

      if (!subscription) {
        console.error("No active subscription found");
        return;
      }

      const DAYS_TO_SHOW_VERSION_ALERT_SINCE_END_OF_TRIAL = 14;

      if (subscription.plan.id === BillingPlan.Free) {
        const daysSinceStartOfPlan = Math.abs(
          (Date.now() - new Date(subscription.startDate).getTime()) / ONE_DAY
        );

        const previouslyOnTrial = customer.trialedPlans.length > 0;
        const showUpgradeTrialButton =
          previouslyOnTrial &&
          daysSinceStartOfPlan < DAYS_TO_SHOW_VERSION_ALERT_SINCE_END_OF_TRIAL;

        setUpgradeButtonData({
          trialDaysLeft: 0,
          trialLeftProgress: 0,
          showUpgradeTrialButton,
        });
      } else if (subscription.plan.pricingType !== PricingType.Free) {
        setUpgradeButtonData({
          showUpgradeDefaultButton: true,
          showUpgradeTrialButton: false,
        });
      } else {
        const trialDaysLeft = Math.round(
          Math.abs((subscription.trialEndDate.getTime() - Date.now()) / ONE_DAY)
        );
        const trialLeftProgress =
          (100 * trialDaysLeft) / subscription.plan.defaultTrialConfig.duration;

        setUpgradeButtonData({
          trialDaysLeft,
          trialLeftProgress,
          showUpgradeTrialButton: true,
        });
      }
    }
  }, [currentWorkspace]);

  useEffect(() => {
    getCurrentSubscription().catch(console.error);
  }, [getCurrentSubscription]);

  const canShowNotification = stigg.getBooleanEntitlement({
    featureId: BillingFeature.Notification,
  }).hasAccess;

  const [showProfileFormDialog, setShowProfileFormDialog] =
    useState<boolean>(false);

  const handleSignOut = useCallback(() => {
    unsetToken();
    apolloClient.clearStore();

    window.location.replace(NX_REACT_APP_AUTH_LOGOUT_URI);
  }, [history, apolloClient]);

  const onNotificationClick = useCallback((message: IMessage) => {
    // your logic to handle the notification click
    if (message?.cta?.data?.url) {
      window.location.href = message.cta.data.url;
    }
  }, []);

  const onBuildNotificationClick = useCallback(
    (templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) => {
      if (templateIdentifier === "build-completed") {
        window.location.href = message.cta.data.url;
      }
    },
    []
  );

  const handleUpgradeClick = useCallback(() => {
    history.push(`/${currentWorkspace.id}/purchase`, {
      from: { pathname: window.location.pathname },
    });
    trackEvent({
      eventName: AnalyticsEventNames.UpgradeOnTopBarClick,
      workspace: currentWorkspace.id,
    });
  }, [currentWorkspace, window.location.pathname]);

  const handleContactUsClick = useCallback(() => {
    // This query param is used to open HubSpot chat with the downgrade flow
    history.push("?contact-us=true");
    openHubSpotChat();
    trackEvent({
      eventName: AnalyticsEventNames.HelpMenuItemClick,
      Action: "Contact Us",
      workspaceId: currentWorkspace.id,
    });
  }, [openHubSpotChat]);

  const handleItemDataClicked = useCallback(
    (itemData: ItemDataCommand) => {
      if (itemData === ItemDataCommand.COMMAND_CONTACT_US) {
        handleContactUsClick();
      }
      return;
    },
    [handleContactUsClick]
  );
  const handleShowProfileForm = useCallback(() => {
    setShowProfileFormDialog(!showProfileFormDialog);
  }, [showProfileFormDialog, setShowProfileFormDialog]);

  const Footer = () => <div></div>;

  return (
    <>
      <Dialog
        className="new-entity-dialog"
        isOpen={showProfileFormDialog}
        onDismiss={handleShowProfileForm}
        title="User Profile"
      >
        <ProfileForm />
      </Dialog>
      <GitHubBanner />
      <div className={CLASS_NAME}>
        <div className={`${CLASS_NAME}__left`}>
          <div className={`${CLASS_NAME}__logo`}>
            <Link to={`/${currentWorkspace?.id}`}>
              <Icon icon="logo" size="medium" />
            </Link>
          </div>
          <span>
            <a
              href="https://github.com/amplication/amplication/releases"
              target="_blank"
              rel="noopener noreferrer"
              className={`${CLASS_NAME}__version`}
            >
              v{version}
            </a>
          </span>
          <Breadcrumbs>
            {breadcrumbsContext.breadcrumbsItems.map((item, index) => (
              <Breadcrumbs.Item key={item.url} to={item.url}>
                {item.name}
              </Breadcrumbs.Item>
            ))}
          </Breadcrumbs>
        </div>
        <div className={`${CLASS_NAME}__center`}></div>
        <div className={`${CLASS_NAME}__right`}>
          <div className={`${CLASS_NAME}__links`}>
            {upgradeButtonData.showUpgradeTrialButton ? (
              <ButtonProgress
                className={`${CLASS_NAME}__upgrade__btn`}
                onClick={handleUpgradeClick}
                progress={upgradeButtonData.trialLeftProgress}
                leftValue={`${upgradeButtonData.trialDaysLeft} days free trial left`}
                yellowColorThreshold={50}
                redColorThreshold={0}
              >
                Upgrade
              </ButtonProgress>
            ) : (
              upgradeButtonData.showUpgradeDefaultButton && (
                <Button
                  className={`${CLASS_NAME}__upgrade__btn`}
                  buttonStyle={EnumButtonStyle.Outline}
                  onClick={handleUpgradeClick}
                >
                  Upgrade
                </Button>
              )
            )}
          </div>
          <hr className={`${CLASS_NAME}__vertical_border`} />

          <CommandPalette
            trigger={
              <Tooltip
                className="amp-menu-item__tooltip"
                aria-label={`Search (${isMacOs ? "⌘" : "Ctrl"}+Shift+K)`}
                direction="sw"
                noDelay
              >
                <Button
                  buttonStyle={EnumButtonStyle.Text}
                  icon="search"
                  iconSize="small"
                />
              </Tooltip>
            }
          />
          <hr className={`${CLASS_NAME}__vertical_border`} />
          <div className={`${CLASS_NAME}__help_popover`}>
            <SelectMenu
              title="Help"
              buttonStyle={EnumButtonStyle.Text}
              icon="chevron_down"
              openIcon="chevron_up"
              className={`${CLASS_NAME}__help_popover__menu`}
            >
              <SelectMenuModal align="right">
                <SelectMenuList>
                  {HELP_MENU_LIST.map((route: HelpMenuItem, index) => (
                    <SelectMenuItem
                      closeAfterSelectionChange
                      onSelectionChange={() => {
                        !route.url && handleItemDataClicked(route.itemData);
                      }}
                      key={index}
                      {...(route.url
                        ? {
                            rel: "noopener noreferrer",
                            href: route.url,
                            target: "_blank",
                          }
                        : {})}
                    >
                      <div className={`${CLASS_NAME}__help_popover__name`}>
                        {route.name}
                      </div>
                    </SelectMenuItem>
                  ))}
                </SelectMenuList>
              </SelectMenuModal>
            </SelectMenu>
          </div>
          {canShowNotification && (
            <>
              <hr className={`${CLASS_NAME}__vertical_border`} />
              <div className={`${CLASS_NAME}__notification_bell`}>
                <NovuProvider
                  subscriberId={currentWorkspace.externalId}
                  applicationIdentifier={NX_REACT_APP_NOVU_IDENTIFIER}
                >
                  <PopoverNotificationCenter
                    colorScheme={"dark"}
                    onNotificationClick={onNotificationClick}
                    onActionClick={onBuildNotificationClick}
                    footer={() => <Footer />}
                  >
                    {({ unseenCount }) => (
                      <NotificationBell unseenCount={unseenCount} />
                    )}
                  </PopoverNotificationCenter>
                </NovuProvider>
              </div>
            </>
          )}
          <hr className={`${CLASS_NAME}__vertical_border`} />
          <div
            className={`${CLASS_NAME}__user_badge_wrapper`}
            onClick={handleShowProfileForm}
          >
            <UserBadge />
          </div>

          <hr className={`${CLASS_NAME}__vertical_border`} />

          <CommandPalette
            trigger={
              <Tooltip
                className="amp-menu-item__tooltip"
                aria-label={`Logout`}
                direction="sw"
                noDelay
              >
                <Button
                  buttonStyle={EnumButtonStyle.Text}
                  icon="log_out"
                  onClick={handleSignOut}
                />
              </Tooltip>
            }
          />
        </div>
      </div>

      {currentProject?.useDemoRepo && (
        <div className={`${CLASS_NAME}__highlight`}>
          Notice: You're currently using a preview repository for your generated
          code. For a full personalized experience, please&nbsp;
          <Link
            title={"Go to project settings"}
            to={`/${currentWorkspace?.id}/${currentProject?.id}/git-sync`}
          >
            connect to your own repository
          </Link>
        </div>
      )}
    </>
  );
};

export default WorkspaceHeader;
