import * as React from 'react';

import { Button, Flex, Loader } from '@strapi/design-system';
import { useAPIErrorHandler, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { useFormik, Form, FormikProvider } from 'formik';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { useContentTypes } from '../../../../../../../../admin/src/hooks/useContentTypes';
import { useInjectReducer } from '../../../../../../../../admin/src/hooks/useInjectReducer';
import { useLicenseLimits } from '../../../../../../hooks';
import { resetWorkflow } from '../../actions';
import * as Layout from '../../components/Layout';
import * as LimitsModal from '../../components/LimitsModal';
import { Stages } from '../../components/Stages';
import { WorkflowAttributes } from '../../components/WorkflowAttributes';
import { REDUX_NAMESPACE } from '../../constants';
import { useReviewWorkflows } from '../../hooks/useReviewWorkflows';
import { reducer, initialState } from '../../reducer';
import { getWorkflowValidationSchema } from '../../utils/getWorkflowValidationSchema';

export function ReviewWorkflowsCreateView() {
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const { push } = useHistory();
  const { formatAPIError } = useAPIErrorHandler();
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const { collectionTypes, singleTypes, isLoading: isLoadingModels } = useContentTypes();
  const {
    clientState: {
      currentWorkflow: { data: currentWorkflow, isDirty: currentWorkflowIsDirty },
    },
  } = useSelector((state) => state?.[REDUX_NAMESPACE] ?? initialState);
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const { license, isLoading: isLicenseLoading } = useLicenseLimits();
  const { pagination, isLoading: isWorkflowLoading } = useReviewWorkflows();

  const { mutateAsync, isLoading } = useMutation(
    async ({ workflow }) => {
      const {
        data: { data },
      } = await post(`/admin/review-workflows/workflows`, {
        data: workflow,
      });

      return data;
    },
    {
      onSuccess() {
        toggleNotification({
          type: 'success',
          message: {
            id: 'Settings.review-workflows.create.page.notification.success',
            defaultMessage: 'Workflow successfully created',
          },
        });
      },
    }
  );

  const submitForm = async () => {
    try {
      const workflow = await mutateAsync({ workflow: currentWorkflow });

      push(`/settings/review-workflows/${workflow.id}`);

      return workflow;
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });

      return null;
    }
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: currentWorkflow,
    async onSubmit() {
      submitForm();
    },
    validationSchema: getWorkflowValidationSchema({ formatMessage }),
  });

  useInjectReducer(REDUX_NAMESPACE, reducer);

  React.useEffect(() => {
    dispatch(resetWorkflow());
  }, [dispatch]);

  React.useEffect(() => {
    if (!isWorkflowLoading && !isLicenseLoading) {
      if (pagination?.total >= license?.data?.workflows) {
        setShowLimitModal('workflow');
      } else if (currentWorkflow.stages.length >= license?.data.stagesPerWorkflow) {
        setShowLimitModal('stage');
      }
    }
  }, [
    currentWorkflow.stages.length,
    isLicenseLoading,
    isWorkflowLoading,
    license?.data.stagesPerWorkflow,
    license?.data?.workflows,
    pagination?.total,
  ]);

  return (
    <>
      <Layout.DragLayerRendered />

      <FormikProvider value={formik}>
        <Form onSubmit={formik.handleSubmit}>
          <Layout.Header
            navigationAction={<Layout.Back href="/settings/review-workflows" />}
            primaryAction={
              <Button
                startIcon={<Check />}
                type="submit"
                size="M"
                disabled={!currentWorkflowIsDirty}
                isLoading={isLoading}
              >
                {formatMessage({
                  id: 'global.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            }
            title={formatMessage({
              id: 'Settings.review-workflows.create.page.title',
              defaultMessage: 'Create Review Workflow',
            })}
            subtitle={formatMessage(
              {
                id: 'Settings.review-workflows.page.subtitle',
                defaultMessage: '{count, plural, one {# stage} other {# stages}}',
              },
              { count: currentWorkflow?.stages?.length ?? 0 }
            )}
          />
          <Layout.Root>
            <Flex alignItems="stretch" direction="column" gap={7}>
              {isLoadingModels ? (
                <Loader>
                  {formatMessage({
                    id: 'Settings.review-workflows.page.isLoading',
                    defaultMessage: 'Workflow is loading',
                  })}
                </Loader>
              ) : (
                <Flex alignItems="stretch" direction="column" gap={7}>
                  <WorkflowAttributes contentTypes={{ collectionTypes, singleTypes }} />
                  <Stages stages={formik.values?.stages} />
                </Flex>
              )}
            </Flex>
          </Layout.Root>
        </Form>
      </FormikProvider>

      <LimitsModal.Root
        isOpen={showLimitModal === 'workflow'}
        onClose={() => setShowLimitModal(false)}
      >
        <LimitsModal.Title>
          {formatMessage({
            id: 'Settings.review-workflows.create.page.workflows.limit.title',
            defaultMessage: 'You’ve reached the limit of workflows in your plan',
          })}
        </LimitsModal.Title>

        <LimitsModal.Body>
          {formatMessage({
            id: 'Settings.review-workflows.create.page.workflows.limit.body',
            defaultMessage: 'Delete a workflow or contact Sales to enable more workflows.',
          })}
        </LimitsModal.Body>
      </LimitsModal.Root>

      <LimitsModal.Root
        isOpen={showLimitModal === 'stage'}
        onClose={() => setShowLimitModal(false)}
      >
        <LimitsModal.Title>
          {formatMessage({
            id: 'Settings.review-workflows.create.page.stages.limit.title',
            defaultMessage: 'You have reached the limit of stages for this workflow in your plan',
          })}
        </LimitsModal.Title>

        <LimitsModal.Body>
          {formatMessage({
            id: 'Settings.review-workflows.create.page.stages.limit.body',
            defaultMessage: 'Try deleting some stages or contact Sales to enable more stages.',
          })}
        </LimitsModal.Body>
      </LimitsModal.Root>
    </>
  );
}
